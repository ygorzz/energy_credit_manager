import { Prisma } from '../../db/generated/prisma/client.js';
import { db } from '../../db/prisma.js';
import BadRequestError from '../../errors/bad-request.error.js';
import ConflictError from '../../errors/conflict.error.js';
import NotFoundError from '../../errors/not-found.error.js';
import type {
  createCreditAllocationDTO,
  updateCreditAllocationDTO,
} from './credit-allocation.dto.js';

export default class CreditAllocationService {
  public create = async (data: createCreditAllocationDTO) => {
    try {
      // 1 - Get the distributorId for update monthly distributor balance
      const clientCompany = await db.clientCompany.findUnique({
        where: {
          id: data.clientCompanyId,
        },
      });
      if (!clientCompany) throw new NotFoundError('Client company not found');

      // 1.1 - Defines percentageApplied
      let percentageApplied: number;
      if (data.percentageApplied === null) {
        percentageApplied = clientCompany.allocationPercentage;
      } else {
        percentageApplied = data.percentageApplied;
      }

      // 2 - Get monthly energy balance
      const { distributorId } = clientCompany;
      const { month, year } = data;
      const monthlyDistributorBalanceRecord = await db.monthlyDistributorBalance.findUnique({
        where: {
          distributorId_year_month: {
            distributorId,
            year,
            month,
          },
        },
      });
      // Only create a credit allocation if at least one monthly generation was created
      if (!monthlyDistributorBalanceRecord)
        throw new NotFoundError('Unable to allocate credits. No energy input yet.');

      // 3 - Checks if there is avaliable energy to allocate
      const energyToBeAllocated = new Prisma.Decimal(data.energyAllocatedMwh);
      if (energyToBeAllocated.greaterThan(monthlyDistributorBalanceRecord.avaliableEnergyMwh)) {
        throw new BadRequestError('The requested energy allocated exceeds the available energy.');
      }
      // 4 - Check if the requested percentage is correct
      const totalEnergyGenerated = monthlyDistributorBalanceRecord.totalEnergyGeneratedMwh;
      const correctPercentage = energyToBeAllocated
        .mul(100) // Prisma Decimals type methods
        .div(totalEnergyGenerated);
      if (data.percentageApplied !== correctPercentage.toNumber()) {
        throw new BadRequestError(
          'The allocation percentage does not correspond to the requested energy allocated.',
        );
      }

      // 5 - Creates new Credit allocation
      const newCreditAllocation = await db.creditAllocation.create({
        data: {
          ...data,
          percentageApplied,
        },
      });

      // 6 - Update monthly distributor balance
      await db.monthlyDistributorBalance.update({
        where: {
          distributorId_year_month: {
            distributorId,
            year,
            month,
          },
        },
        data: {
          totalEnergyAllocatedMwh: {
            increment: data.energyAllocatedMwh,
          },
          avaliableEnergyMwh: {
            decrement: data.energyAllocatedMwh,
          },
        },
      });
      return newCreditAllocation;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2003') {
          throw new NotFoundError('Client company id not found in the database');
        }
        if (error.code === 'P2002') {
          throw new ConflictError('Already exits a register with these data');
        }
      }
      throw error;
    }
  };

  public findAll = async (page: number, limit: number) => {
    const skip = (page - 1) * limit;
    const creditAllocations = await db.creditAllocation.findMany({
      skip,
      take: limit,
    });
    return creditAllocations;
  };

  public findById = async (id: string) => {
    const creditAllocationFound = await db.creditAllocation.findUnique({
      where: {
        id,
      },
    });

    if (!creditAllocationFound) throw new NotFoundError('Credit allocation not found');

    return creditAllocationFound;
  };

  public delete = async (id: string) => {
    try {
      return await db.$transaction(
        async (tx) => {
          // 1 - get the credit allocation
          const allocation = await tx.creditAllocation.findUnique({
            where: { id },
            include: { clientCompany: true },
          });
          if (!allocation) throw new NotFoundError('Credit allocation not found');

          const balanceKey = {
            distributorId: allocation.clientCompany.distributorId,
            year: allocation.year,
            month: allocation.month,
          };
          // 2 - get the monthly distributor balance to update
          const balance = await tx.monthlyDistributorBalance.findUnique({
            where: { distributorId_year_month: balanceKey },
          });
          if (!balance) throw new NotFoundError('Monthly distributor balance not found');
          // 3 - check if has avliable energy to delete
          if (balance.totalEnergyAllocatedMwh.lessThan(allocation.energyAllocatedMwh)) {
            throw new ConflictError(
              'The monthly allocated balance is inconsistent with this credit.',
            );
          }

          // 4 - delete and update data
          const deletedAllocation = await tx.creditAllocation.delete({ where: { id } });
          await tx.monthlyDistributorBalance.update({
            where: { distributorId_year_month: balanceKey },
            data: {
              totalEnergyAllocatedMwh: { decrement: allocation.energyAllocatedMwh },
              avaliableEnergyMwh: { increment: allocation.energyAllocatedMwh },
            },
          });
          return deletedAllocation;
        },
        // 5 - define DB Isolation level = Serializable
        // -> transactions that occur at the same time are treated as simultaneous transactions
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new NotFoundError('Credit allocation or monthly distributor balance not found');
        }
        // serializable isolation level error
        if (error.code === 'P2034') {
          throw new ConflictError('The allocation or balance changed concurrently. Please retry.');
        }
      }
      throw error;
    }
  };

  public update = async (id: string, data: updateCreditAllocationDTO) => {
    try {
      return await db.$transaction(
        async (tx) => {
          // 1 - get the credit allocation
          const allocation = await tx.creditAllocation.findUnique({
            where: { id },
            include: { clientCompany: true },
          });
          if (!allocation) throw new NotFoundError('Credit allocation not found');

          // 2 - get the new or the same client company
          const clientCompanyId = data.clientCompanyId ?? allocation.clientCompanyId;
          const clientCompany =
            clientCompanyId === allocation.clientCompanyId
              ? allocation.clientCompany
              : await tx.clientCompany.findUnique({ where: { id: clientCompanyId } });
          if (!clientCompany) throw new NotFoundError('Client company not found');

          const month = data.month ?? allocation.month;
          const year = data.year ?? allocation.year;
          const oldEnergy = allocation.energyAllocatedMwh;
          const newEnergy = new Prisma.Decimal(data.energyAllocatedMwh ?? oldEnergy);
          const oldKey = {
            distributorId: allocation.clientCompany.distributorId,
            year: allocation.year,
            month: allocation.month,
          };
          const newKey = { distributorId: clientCompany.distributorId, year, month };
          const sameBalance =
            oldKey.distributorId === newKey.distributorId &&
            oldKey.year === newKey.year &&
            oldKey.month === newKey.month;

          // 3 - get the old distributor monthly balance
          const oldBalance = await tx.monthlyDistributorBalance.findUnique({
            where: { distributorId_year_month: oldKey },
          });
          if (!oldBalance)
            throw new NotFoundError('Original monthly distributor balance not found');
          if (oldBalance.totalEnergyAllocatedMwh.lessThan(oldEnergy)) {
            throw new ConflictError(
              'The monthly allocated balance is inconsistent with this credit.',
            );
          }

          const targetBalance = sameBalance
            ? oldBalance
            : await tx.monthlyDistributorBalance.findUnique({
                where: { distributorId_year_month: newKey },
              });
          if (!targetBalance)
            throw new NotFoundError('Target monthly distributor balance not found');

          const delta = newEnergy.sub(oldEnergy);
          const requiredEnergy = sameBalance ? delta : newEnergy;
          if (requiredEnergy.greaterThan(targetBalance.avaliableEnergyMwh)) {
            throw new BadRequestError(
              'The requested allocated energy exceeds the available energy.',
            );
          }

          const percentageApplied =
            data.percentageApplied === null
              ? clientCompany.allocationPercentage
              : (data.percentageApplied ?? allocation.percentageApplied);
          const updatedAllocation = await tx.creditAllocation.update({
            where: { id },
            data: {
              clientCompanyId,
              month,
              year,
              energyAllocatedMwh: newEnergy,
              percentageApplied,
            },
          });

          if (sameBalance) {
            if (!delta.isZero()) {
              await tx.monthlyDistributorBalance.update({
                where: { distributorId_year_month: oldKey },
                data: {
                  totalEnergyAllocatedMwh: { increment: delta },
                  avaliableEnergyMwh: { decrement: delta },
                },
              });
            }
          } else {
            await tx.monthlyDistributorBalance.update({
              where: { distributorId_year_month: oldKey },
              data: {
                totalEnergyAllocatedMwh: { decrement: oldEnergy },
                avaliableEnergyMwh: { increment: oldEnergy },
              },
            });
            await tx.monthlyDistributorBalance.update({
              where: { distributorId_year_month: newKey },
              data: {
                totalEnergyAllocatedMwh: { increment: newEnergy },
                avaliableEnergyMwh: { decrement: newEnergy },
              },
            });
          }
          return updatedAllocation;
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new NotFoundError('Credit allocation or monthly distributor balance not found');
        }
        if (error.code === 'P2003') {
          throw new NotFoundError('Client company not found in the database');
        }
        if (error.code === 'P2002') {
          throw new ConflictError('A credit allocation already exists for this company and period');
        }
        if (error.code === 'P2034') {
          throw new ConflictError('The allocation or balance changed concurrently. Please retry.');
        }
      }
      throw error;
    }
  };
}
