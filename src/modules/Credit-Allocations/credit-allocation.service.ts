import { Prisma } from '../../db/generated/prisma/client.js';
import { db } from '../../db/prisma.js';
import BadRequestError from '../../errors/bad-request.error.js';
import ConflictError from '../../errors/conflict.error.js';
import NotFoundError from '../../errors/not-found.error.js';
import type ClientCompanyRepository from '../Client-Companies/client-company.repository.js';
import type MonthlyDistributorBalanceRepository from '../Distributors/distributor-balance.repository.js';
import type {
  createCreditAllocationDTO,
  updateCreditAllocationDTO,
} from './credit-allocation.dto.js';
import type CreditAllocationRepository from './credit-allocation.repository.js';

export default class CreditAllocationService {
  constructor(
    private creditAllocationRepository: CreditAllocationRepository,
    private clientCompanyRepository: ClientCompanyRepository,
    private monthlyDistributorBalanceRepository: MonthlyDistributorBalanceRepository,
  ) {}

  public createCreditAllocation = async (data: createCreditAllocationDTO) => {
    try {
      return await db.$transaction(
        async (tx) => {
          // 1 - Get the distributorId for update monthly distributor balance
          const clientCompany = await this.clientCompanyRepository.findById(
            data.clientCompanyId,
            tx,
          );
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
          const monthlyDistributorBalanceRecord =
            await this.monthlyDistributorBalanceRepository.findById(distributorId, year, month, tx);
          // Only create a credit allocation if at least one monthly generation was created
          if (!monthlyDistributorBalanceRecord)
            throw new NotFoundError('Unable to allocate credits. No energy input yet.');

          // 3 - Checks if there is avaliable energy to allocate
          const energyToBeAllocated = new Prisma.Decimal(data.energyAllocatedMwh);
          if (energyToBeAllocated.greaterThan(monthlyDistributorBalanceRecord.avaliableEnergyMwh)) {
            throw new BadRequestError(
              'The requested energy allocated exceeds the available energy.',
            );
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
          const newCreditAllocation = await this.creditAllocationRepository.create(
            { ...data, percentageApplied },
            tx,
          );

          // 6 - Update monthly distributor balance
          await this.monthlyDistributorBalanceRepository.update(
            distributorId,
            year,
            month,
            {
              totalEnergyAllocatedMwh: { increment: energyToBeAllocated },
              avaliableEnergyMwh: { decrement: energyToBeAllocated },
            },
            tx,
          );
          return newCreditAllocation;
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2034') {
          throw new ConflictError('The allocation or balance changed concurrently. Please retry.');
        }
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

  public listCreditAllocations = async (page: number, limit: number) => {
    const skip = (page - 1) * limit;
    const creditAllocations = await this.creditAllocationRepository.findAll(skip, limit);
    return creditAllocations;
  };

  public getCreditAllocationById = async (id: string) => {
    const creditAllocationFound = await this.creditAllocationRepository.findById(id);

    if (!creditAllocationFound) throw new NotFoundError('Credit allocation not found');

    return creditAllocationFound;
  };

  public deleteCreditAllocation = async (id: string) => {
    try {
      return await db.$transaction(
        async (tx) => {
          // 1 - get the credit allocation
          const allocation = await this.creditAllocationRepository.findByIdWithCompany(id, tx);
          if (!allocation) throw new NotFoundError('Credit allocation not found');

          const balanceKey = {
            distributorId: allocation.clientCompany.distributorId,
            year: allocation.year,
            month: allocation.month,
          };
          // 2 - get the monthly distributor balance to update
          const balance = await this.monthlyDistributorBalanceRepository.findById(
            balanceKey.distributorId,
            balanceKey.year,
            balanceKey.month,
            tx,
          );
          if (!balance) throw new NotFoundError('Monthly distributor balance not found');
          // 3 - check if has avliable energy to delete
          if (balance.totalEnergyAllocatedMwh.lessThan(allocation.energyAllocatedMwh)) {
            throw new ConflictError(
              'The monthly allocated balance is inconsistent with this credit.',
            );
          }

          // 4 - delete and update data
          const deletedAllocation = await this.creditAllocationRepository.delete(id, tx);
          await this.monthlyDistributorBalanceRepository.update(
            balanceKey.distributorId,
            balanceKey.year,
            balanceKey.month,
            {
              totalEnergyAllocatedMwh: { decrement: allocation.energyAllocatedMwh },
              avaliableEnergyMwh: { increment: allocation.energyAllocatedMwh },
            },
            tx,
          );
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

  public updateCreditAllocation = async (id: string, data: updateCreditAllocationDTO) => {
    try {
      return await db.$transaction(
        async (tx) => {
          // 1 - get the credit allocation
          const allocation = await this.creditAllocationRepository.findByIdWithCompany(id, tx);
          if (!allocation) throw new NotFoundError('Credit allocation not found');

          // 2 - get the new or the same client company
          const clientCompanyId = data.clientCompanyId ?? allocation.clientCompanyId;
          const clientCompany =
            clientCompanyId === allocation.clientCompanyId
              ? allocation.clientCompany
              : await this.clientCompanyRepository.findById(clientCompanyId, tx);
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
          const oldBalance = await this.monthlyDistributorBalanceRepository.findById(
            oldKey.distributorId,
            oldKey.year,
            oldKey.month,
            tx,
          );
          if (!oldBalance)
            throw new NotFoundError('Original monthly distributor balance not found');
          if (oldBalance.totalEnergyAllocatedMwh.lessThan(oldEnergy)) {
            throw new ConflictError(
              'The monthly allocated balance is inconsistent with this credit.',
            );
          }

          const targetBalance = sameBalance
            ? oldBalance
            : await this.monthlyDistributorBalanceRepository.findById(
                newKey.distributorId,
                newKey.year,
                newKey.month,
                tx,
              );
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
          const updatedAllocation = await this.creditAllocationRepository.update(
            id,
            { clientCompanyId, month, year, energyAllocatedMwh: newEnergy, percentageApplied },
            tx,
          );

          if (sameBalance) {
            if (!delta.isZero()) {
              await this.monthlyDistributorBalanceRepository.update(
                oldKey.distributorId,
                oldKey.year,
                oldKey.month,
                {
                  totalEnergyAllocatedMwh: { increment: delta },
                  avaliableEnergyMwh: { decrement: delta },
                },
                tx,
              );
            }
          } else {
            await this.monthlyDistributorBalanceRepository.update(
              oldKey.distributorId,
              oldKey.year,
              oldKey.month,
              {
                totalEnergyAllocatedMwh: { decrement: oldEnergy },
                avaliableEnergyMwh: { increment: oldEnergy },
              },
              tx,
            );
            await this.monthlyDistributorBalanceRepository.update(
              newKey.distributorId,
              newKey.year,
              newKey.month,
              {
                totalEnergyAllocatedMwh: { increment: newEnergy },
                avaliableEnergyMwh: { decrement: newEnergy },
              },
              tx,
            );
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
