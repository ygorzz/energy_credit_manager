import type { NextFunction, Request, Response } from 'express';
import { uuidSchema } from '../../shared/schemas/uuid.dto.js';
import type { IdParams } from '../../types.js';
import {
  createMonthlyGenerationSchema,
  listMonthlyGenerationsSchema,
  updateMonthlyGenerationSchema,
} from './monthly-generation.dto.js';
import type MonthlyGenerationService from './monthly-generation.service.js';

export default class MonthlyGenerationsController {
  constructor(private monthlyGenerationService: MonthlyGenerationService) {}

  // Preserve response keys while using concise local result names.
  public createMonthlyGeneration = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validatedData = createMonthlyGenerationSchema.parse(req.body);
      const created = await this.monthlyGenerationService.createMonthlyGeneration(validatedData);
      return res.status(201).json({
        message: 'Monthly Generation created successfully!',
        created,
      });
    } catch (error) {
      next(error);
    }
  };

  public listMonthlyGenerations = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { page, limit } = listMonthlyGenerationsSchema.parse(req.query);
      const generations = await this.monthlyGenerationService.listMonthlyGenerations(page, limit);
      return res.status(200).json(generations);
    } catch (error) {
      next(error);
    }
  };

  public getMonthlyGenerationById = async (
    req: Request<IdParams>,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const validatedParams = uuidSchema.parse(req.params);
      const { id } = validatedParams;
      const generation = await this.monthlyGenerationService.getMonthlyGenerationById(id);
      return res.status(200).json(generation);
    } catch (error) {
      next(error);
    }
  };

  // types the Request with the IdParams type for id: string
  public deleteMonthlyGeneration = async (
    req: Request<IdParams>,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const validatedParams = uuidSchema.parse(req.params);
      const { id } = validatedParams;
      const deleted = await this.monthlyGenerationService.deleteMonthlyGeneration(id);
      // Deletion with a response body returns 200; reserve 201 for creation.
      return res.status(200).json({
        message: 'Monthly generation deleted successfully!',
        deleted,
      });
    } catch (error) {
      next(error);
    }
  };

  public updateMonthlyGeneration = async (
    req: Request<IdParams>,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const validatedParams = uuidSchema.parse(req.params);
      const { id } = validatedParams;
      const validatedData = updateMonthlyGenerationSchema.parse(req.body);
      const updated = await this.monthlyGenerationService.updateMonthlyGeneration(
        id,
        validatedData,
      );
      // Updates return 200 with the persisted generation.
      return res.status(200).json({
        message: 'Monthly Generation updated successfully!',
        updated,
      });
    } catch (error) {
      next(error);
    }
  };
}
