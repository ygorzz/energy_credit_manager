import { db } from '../../db/prisma.js';
import type { createPowerPlantDTO } from './power-plant.dto.js';

export default class PowerPlantService {
  public create = async (data: createPowerPlantDTO) => {
    // const createdPowerPlant = await db.powerPlant.create({
    // data,
    // });
    // return createdPowerPlant;
  };
}
