import type { NextFunction, Request, Response } from "express";
import {
  createPowerPlantSchema,
  listPowerPlantsSchema,
  updatePowerPlantSchema,
} from "./power-plant.dto.js";
import type PowerPlantService from "./power-plant.service.js";
import type { IdParams } from "../../types.js";

export default class PowerPlantsController {
  constructor(private powerPlantService: PowerPlantService) {}

  public createPowerPlant = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const validatedData = createPowerPlantSchema.parse(req.body);
      const newPowerPlant = await this.powerPlantService.create(validatedData);
      return res
        .status(201)
        .json({ message: "Power Plant created successfully!", newPowerPlant });
    } catch (error) {
      next(error);
    }
  };

  public listPowerPlants = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const { page, limit } = listPowerPlantsSchema.parse(req.query);
      const powerPlants = await this.powerPlantService.findAll(page, limit);
      return res.status(200).json(powerPlants);
    } catch (error) {
      next(error);
    }
  };

  public getPowerPlantById = async (
    req: Request<IdParams>,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const { id } = req.params;
      const powerPlantFound = await this.powerPlantService.findById(id);
      return res.status(200).json(powerPlantFound);
    } catch (error) {
      next(error);
    }
  };

  // types the Request with the IdParams type for id: string
  public deletePowerPlant = async (
    req: Request<IdParams>,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const { id } = req.params;
      const powerPlantDeleted = await this.powerPlantService.delete(id);
      return res.status(200).json({
        message: "Power plant deleted successfully!",
        powerPlantDeleted,
      });
    } catch (error) {
      next(error);
    }
  };

  public updatePowerPlant = async (
    req: Request<IdParams>,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const { id } = req.params;
      const validatedData = updatePowerPlantSchema.parse(req.body);
      const powerPlantUpdated = await this.powerPlantService.update(
        id,
        validatedData,
      );
      return res.status(200).json({
        message: "Power plant updated successfully!",
        powerPlantUpdated,
      });
    } catch (error) {
      next(error);
    }
  };
}
