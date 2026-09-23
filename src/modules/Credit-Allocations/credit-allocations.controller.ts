import type { NextFunction, Request, Response } from "express";
import { uuidSchema } from "../../shared/schemas/uuid.dto.js";
import type CreditAllocationService from "./credit-allocation.service.js";
import {
  createCreditAllocationSchema,
  listCreditAllocationsSchema,
  updateCreditAllocationSchema,
} from "./credit-allocation.dto.js";

export default class CreditAllocationsController {
  constructor(private creditAllocationService: CreditAllocationService) {}

  public createCreditAllocation = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const validatedData = createCreditAllocationSchema.parse(req.body);
      const newCreditAllocation =
        await this.creditAllocationService.create(validatedData);
      return res.status(201).json({
        message: "Credit allocation created succesfully!",
        newCreditAllocation,
      });
    } catch (error) {
      next(error);
    }
  };

  public listcreditAllocations = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const { page, limit } = listCreditAllocationsSchema.parse(req.query);
      const creditAlocations = await this.creditAllocationService.findAll(
        page,
        limit,
      );
      return res.status(200).json(creditAlocations);
    } catch (error) {
      next(error);
    }
  };

  public getCreditAllocationById = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const idValidated = uuidSchema.parse(req.params);
      const { id } = idValidated;
      const creditAllocationFound =
        await this.creditAllocationService.findById(id);
      return res.status(200).json(creditAllocationFound);
    } catch (error) {
      next(error);
    }
  };

  public deleteCreditAllocation = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const idValidated = uuidSchema.parse(req.params);
      const { id } = idValidated;
      const creditAllocationDeleted =
        await this.creditAllocationService.delete(id);
      return res.status(200).json({
        message: "Credit allocation deleted successfully!",
        creditAllocationDeleted,
      });
    } catch (error) {
      next(error);
    }
  };

  public updateCreditAllocation = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const idValidated = uuidSchema.parse(req.params);
      const validatedData = updateCreditAllocationSchema.parse(req.body);
      const { id } = idValidated;
      const creditAllocationUpdated = await this.creditAllocationService.update(
        id,
        validatedData,
      );
      return res.status(200).json({
        message: "Credit allocation updated successfully!",
        creditAllocationUpdated,
      });
    } catch (error) {
      next(error);
    }
  };
}
