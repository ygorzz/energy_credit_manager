import { db } from "../../db/prisma.js";
import type {
  createPowerPlantDTO,
  updatePowerPlantDTO,
} from "./power-plant.dto.js";


export default class PowerPlantRepository {
  public create = async (data: createPowerPlantDTO) => {
    return await db.distributor.create({
      data,
    });
  };

  public findAll = async (skip: number, take: number) => {
    return await db.distributor.findMany({
      skip,
      take,
    });
  };

  public findById = async (id: string) => {
    return await db.distributor.findUnique({
      where: {
        id,
      },
    });
  };

  public delete = async (id: string) => {
    return await db.distributor.delete({
      where: {
        id,
      },
    });
  };

  public update = async (id: string, data: updatePowerPlantDTO) => {
    return await db.distributor.update({
      where: {
        id,
      },
      data: {
        data,
      },
    });
  };
}
