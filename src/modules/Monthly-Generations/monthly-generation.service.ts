import { Prisma } from "../../db/generated/prisma/client.js";
import { db } from "../../db/prisma.js";
import ConflictError from "../../errors/conflict.error.js";
import NotFoundError from "../../errors/not-found.error.js";
import type {
  CreateMonthlyGenerationDTO,
  UpdateMonthlyGenerationDTO,
} from "./monthly-generation.dto.js";

export default class MonthlyGenerationService {
  public create = async (data: CreateMonthlyGenerationDTO) => {
    try {
      const newMonthlyGeneration = await db.monthlyGeneration.create({
        data,
      });

      // Creates/updates the monthly distributor balance record
      const powerPlant = await db.powerPlant.findUnique({
        where: {
          id: data.powerPlantId,
        },
      });

      if (!powerPlant) throw new NotFoundError("Power plant id not found");

      const { distributorId } = powerPlant;
      const { month, year } = data;

      await db.monthlyDistributorBalance.upsert({
        where: {
          // Prisma requires a query using only one line, so we use the composting unique key: distributorId_year_month
          distributorId_year_month: {
            distributorId,
            year,
            month,
          },
        },
        // if record already exists
        update: {
          totalEnergyGeneratedMwh: {
            increment: data.energyGeneratedMwh,
          },
          avaliableEnergyMwh: data.energyGeneratedMwh,
        },
        // if record does not exists
        create: {
          year,
          month,
          totalEnergyGeneratedMwh: data.energyGeneratedMwh,
          totalEnergyAllocatedMwh: 0,
          avaliableEnergyMwh: data.energyGeneratedMwh,
          distributorId,
        },
      });
      //

      return newMonthlyGeneration;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2003") {
          throw new NotFoundError("Power plant not found in the database");
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
    const monthlyGenerations = await db.monthlyGeneration.findMany({
      skip,
      take: limit,
    });
    return monthlyGenerations;
  };

  public findById = async (id: string) => {
    const monthlyGenerationFound = await db.monthlyGeneration.findUnique({
      where: {
        id,
      },
    });

    if (!monthlyGenerationFound)
      throw new NotFoundError("Monthly generation not found");

    return monthlyGenerationFound;
  };

  public delete = async (id: string) => {
    try {
      const monthlyGenerationDeleted = await db.monthlyGeneration.delete({
        where: {
          id,
        },
      });

      return monthlyGenerationDeleted;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2025") {
          throw new NotFoundError("Monthly Generation not found");
        }
      }
      throw error;
    }
  };

  public update = async (id: string, data: UpdateMonthlyGenerationDTO) => {
    try {
      const newData = Object.fromEntries(
        Object.entries(data).filter((e) => e[1] !== undefined),
      );
      const monthlyGenerationUpdated = await db.monthlyGeneration.update({
        where: {
          id,
        },
        data: newData,
      });

      return monthlyGenerationUpdated;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2025") {
          throw new NotFoundError("Monthly generation not found");
        }
        if (error.code === "P2003") {
          throw new NotFoundError("Power plant not found in the database");
        }
        if (error.code === "P2002") {
          throw new ConflictError("Already exits a register with these data");
        }
      }
      throw error;
    }
  };
}
