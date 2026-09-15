import type { NextFunction, Request, Response } from 'express';
import { createPowerPlantSchema } from './power-plant.dto.js';
import type PowerPlantService from './power-plant.service.js';

export default class PowerPlantsController {
  constructor(private powerPlantService: PowerPlantService) {}

  public createPowerPlant = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validatedData = createPowerPlantSchema.parse(req.body);
      const createdPowerPlant = await this.powerPlantService.create(validatedData);
      return res
        .status(201)
        .json({ message: 'Power Plant created successfully!', createdPowerPlant });
    } catch (error) {
      next(error);
    }
  };
}
