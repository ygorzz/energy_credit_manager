import { Prisma } from "../../db/generated/prisma/client.js";
import { db } from "../../db/prisma.js";
import ConflictError from "../../errors/conflict.error.js";
import NotFoundError from "../../errors/not-found.error.js";
import type {
  createCreditAllocationDTO,
  updateCreditAllocationDTO,
} from "./credit-allocation.dto.js";

export default class CreditAllocationService {
  public create = async (data: createCreditAllocationDTO) => {
    try {
      let percentageApplied;
      if (data.percentageApplied === null) {
        const clientCompany = await db.clientCompany.findUnique({
          where: {
            id: data.clientCompanyId,
          },
          select: {
            allocationPercentage: true,
          },
        });

        if (!clientCompany) throw new NotFoundError("Client company not found");

        percentageApplied = clientCompany.allocationPercentage;
      } else {
        percentageApplied = data.percentageApplied;
      }

      const newCreditAllocation = await db.creditAllocation.create({
        data: {
          ...data,
          percentageApplied,
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
