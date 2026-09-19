import type { NextFunction, Request, Response } from "express";
import type MonthlyGenerationService from "./monthly-generation.service.js";
import {
  createMonthlyGenerationSchema,
  listMonthlyGenerationsSchema,
  updateMonthlyGenerationSchema,
} from "./monthly-generation.dto.js";
import type { IdParams } from "../../types.js";

export default class MonthlyGenerationsController {
  constructor(private monthlyGenerationService: MonthlyGenerationService) {}

  public createMonthlyGeneration = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const validatedData = createMonthlyGenerationSchema.parse(req.body);
      const newMonthlyGeneration =
        await this.monthlyGenerationService.create(validatedData);
      return res.status(201).json({
        message: "Monthly Generation created successfully!",
        newMonthlyGeneration,
      });
    } catch (error) {
      next(error);
    }
  };

  public listMonthlyGenerations = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const { page, limit } = listMonthlyGenerationsSchema.parse(req.query);
      const monthlyGenerations = await this.monthlyGenerationService.findAll(
        page,
        limit,
      );
      return res.status(200).json(monthlyGenerations);
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
      const { id } = req.params;
      const monthlyGenerationFound =
        await this.monthlyGenerationService.findById(id);
      return res.status(200).json(monthlyGenerationFound);
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
      const { id } = req.params;
      const monthlyGenerationDeleted =
        await this.monthlyGenerationService.delete(id);
      return res.status(201).json({
        message: "Monthly generation deleted successfully!",
        monthlyGenerationDeleted,
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
      const { id } = req.params;
      const validatedData = updateMonthlyGenerationSchema.parse(req.body);
      const monthlyGenerationUpdated =
        await this.monthlyGenerationService.update(id, validatedData);
      return res
        .status(201)
        .json({
          message: "Monthly Generation updated successfully!",
          monthlyGenerationUpdated,
        });
    } catch (error) {
      next(error);
    }
  };
}
