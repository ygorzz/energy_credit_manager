import { Prisma } from "../../db/generated/prisma/client.js";
import { db } from "../../db/prisma.js";
import ConflictError from "../../errors/conflict.error.js";
import NotFoundError from "../../errors/not-found.error.js";
import type {
  createPowerPlantDTO,
  updatePowerPlantDTO,
} from "./power-plant.dto.js";

export default class PowerPlantService {
  public create = async (data: createPowerPlantDTO) => {
    try {
      const newPowerPlant = await db.powerPlant.create({
        data,
      });
      return newPowerPlant;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2002") {
          throw new ConflictError(
            "Already exists a power plant with this name",
          );
        }
      }
      throw error;
    }
  };

  public findAll = async (page: number, limit: number) => {
    const skip = (page - 1) * limit;
    const powerPlants = await db.powerPlant.findMany({
      skip,
      take: limit,
    });
    return powerPlants;
  };

  public findById = async (id: string) => {
    const powerPlantFound = await db.powerPlant.findUnique({
      where: {
        id,
      },
    });

    if (!powerPlantFound) throw new NotFoundError("Power Plant not found");

    return powerPlantFound;
  };

  public delete = async (id: string) => {
    try {
      const powerPlantDeleted = await db.powerPlant.delete({
        where: {
          id,
        },
      });

      return powerPlantDeleted;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2025") {
          throw new NotFoundError("Power plant not found");
        }
      }
      throw error;
    }
  };

  public update = async (id: string, data: updatePowerPlantDTO) => {
    try {
      const newData = Object.fromEntries(
        Object.entries(data).filter((e) => e[1] !== undefined),
      );
      const powerPlantUpdated = await db.powerPlant.update({
        where: {
          id,
        },
        data: newData,
      });

      return powerPlantUpdated;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2025") {
          throw new NotFoundError("Power plant not found");
        }
        if (error.code === "P2003") {
          throw new NotFoundError("Distributor id not found in the database");
        }
        if (error.code === "P2002") {
          throw new ConflictError("Already exits a power plant with this name");
        }
      }
      throw error;
    }
  };
}
