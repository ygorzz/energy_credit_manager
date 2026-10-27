import type { NextFunction, Request, Response } from 'express';
import { uuidSchema } from '../../shared/schemas/uuid.dto.js';
import type { IdParams } from '../../types.js';
import {
  createPowerPlantSchema,
  listPowerPlantsSchema,
  updatePowerPlantSchema,
} from './power-plant.dto.js';
import type PowerPlantService from './power-plant.service.js';

export default class PowerPlantsController {
  constructor(private powerPlantService: PowerPlantService) {}

  // Preserve response keys while using concise local result names.
  public createPowerPlant = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validatedData = createPowerPlantSchema.parse(req.body);
      const created = await this.powerPlantService.createPowerPlant(validatedData);
      return res
        .status(201)
        .json({ message: 'Power Plant created successfully!', created });
    } catch (error) {
      next(error);
    }
  };

  public listPowerPlants = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { page, limit } = listPowerPlantsSchema.parse(req.query);
      const plants = await this.powerPlantService.listPowerPlants(page, limit);
      return res.status(200).json(plants);
    } catch (error) {
      next(error);
    }
  };

  public getPowerPlantById = async (req: Request<IdParams>, res: Response, next: NextFunction) => {
    try {
      const validatedParams = uuidSchema.parse(req.params);
      const { id } = validatedParams;
      const plant = await this.powerPlantService.getPowerPlantById(id);
      return res.status(200).json(plant);
    } catch (error) {
      next(error);
    }
  };

  // types the Request with the IdParams type for id: string
  public deletePowerPlant = async (req: Request<IdParams>, res: Response, next: NextFunction) => {
    try {
      const validatedParams = uuidSchema.parse(req.params);
      const { id } = validatedParams;
      const deleted = await this.powerPlantService.deletePowerPlant(id);
      return res.status(200).json({
        message: 'Power plant deleted successfully!',
        deleted,
      });
    } catch (error) {
      next(error);
    }
  };

  public updatePowerPlant = async (req: Request<IdParams>, res: Response, next: NextFunction) => {
    try {
      const validatedParams = uuidSchema.parse(req.params);
      const { id } = validatedParams;
      const validatedData = updatePowerPlantSchema.parse(req.body);
      const updated = await this.powerPlantService.updatePowerPlant(id, validatedData);
      return res.status(200).json({
        message: 'Power plant updated successfully!',
        updated,
      });
    } catch (error) {
      next(error);
    }
  };
}
