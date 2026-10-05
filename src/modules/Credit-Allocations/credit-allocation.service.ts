import { Prisma } from "../../db/generated/prisma/client.js";
import { db } from "../../db/prisma.js";
import BadRequestError from "../../errors/bad-request.error.js";
import ConflictError from "../../errors/conflict.error.js";
import NotFoundError from "../../errors/not-found.error.js";
import type {
  createCreditAllocationDTO,
  updateCreditAllocationDTO,
} from "./credit-allocation.dto.js";

export default class CreditAllocationService {
  public create = async (data: createCreditAllocationDTO) => {
    try {
      // 1 - Get the distributorId for update monthly distributor balance
      const clientCompany = await db.clientCompany.findUnique({
        where: {
          id: data.clientCompanyId,
        },
      });
      if (!clientCompany) throw new NotFoundError("Client company not found");

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
        await db.monthlyDistributorBalance.findUnique({
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
        throw new NotFoundError(
          "Unable to allocate credits. No energy input yet.",
        );

      // 3 - Checks if there is avaliable energy to allocate
      const energyToBeAllocated = new Prisma.Decimal(data.energyAllocatedMwh);
      if (
        energyToBeAllocated.greaterThan(
          monthlyDistributorBalanceRecord.avaliableEnergyMwh,
        )
      ) {
        throw new BadRequestError(
          "The requested energy allocated exceeds the available energy.",
        );
      }
      // 4 - Check if the requested percentage is correct
      const totalEnergyGenerated =
      monthlyDistributorBalanceRecord.totalEnergyGeneratedMwh;
      const correctPercentage = energyToBeAllocated
        .mul(100) // Prisma Decimals type methods
        .div(totalEnergyGenerated);
      if (data.percentageApplied !== correctPercentage.toNumber()) {
        throw new BadRequestError(
          "The allocation percentage does not correspond to the requested energy allocated.",
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
        if (error.code === "P2003") {
          throw new NotFoundError(
            "Client company id not found in the database",
          );
        }
        if (error.code === "P2002") {
          throw new ConflictError("Already exits a register with these data");
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

    if (!creditAllocationFound)
      throw new NotFoundError("Credit allocation not found");

    return creditAllocationFound;
  };

  public delete = async (id: string) => {
    try {
      const creditAllocationDeleted = await db.creditAllocation.delete({
        where: {
          id,
        },
      });
      return creditAllocationDeleted;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2025") {
          throw new NotFoundError("Credit Allocation not found");
        }
      }
      throw error;
    }
  };

  public update = async (id: string, data: updateCreditAllocationDTO) => {
    try {
      const newData = Object.fromEntries(
        Object.entries(data).filter((e) => e[1] !== undefined || e[1] !== null),
      );
      const CreditAllocationUpdated = await db.creditAllocation.update({
        where: {
          id,
        },
        data: newData,
      });

      return CreditAllocationUpdated;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2025") {
          throw new NotFoundError("Credit allocation not found");
        }
        if (error.code === "P2003") {
          throw new NotFoundError(
            "Client company id not found in the database",
          );
        }
        if (error.code === "P2002") {
          throw new ConflictError("Already exits a register with these data");
        }
      }
      throw error;
    }
  };
}
