import type { NextFunction, Request, Response } from 'express';
import { uuidSchema } from '../../shared/schemas/uuid.dto.js';
import {
  createCreditAllocationSchema,
  listCreditAllocationsSchema,
  updateCreditAllocationSchema,
} from './credit-allocation.dto.js';
import type CreditAllocationService from './credit-allocation.service.js';

export default class CreditAllocationsController {
  constructor(private creditAllocationService: CreditAllocationService) {}

  // Preserve response keys while using concise local result names.
  public createCreditAllocation = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validatedData = createCreditAllocationSchema.parse(req.body);
      const created = await this.creditAllocationService.createCreditAllocation(validatedData);
      return res.status(201).json({
        message: 'Credit allocation created succesfully!',
        created,
      });
    } catch (error) {
      next(error);
    }
  };

  public listCreditAllocations = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { page, limit } = listCreditAllocationsSchema.parse(req.query);
      const allocations = await this.creditAllocationService.listCreditAllocations(page, limit);
      return res.status(200).json(allocations);
    } catch (error) {
      next(error);
    }
  };

  public getCreditAllocationById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validatedParams = uuidSchema.parse(req.params);
      const { id } = validatedParams;
      const allocation = await this.creditAllocationService.getCreditAllocationById(id);
      return res.status(200).json(allocation);
    } catch (error) {
      next(error);
    }
  };

  public deleteCreditAllocation = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validatedParams = uuidSchema.parse(req.params);
      const { id } = validatedParams;
      const deleted = await this.creditAllocationService.deleteCreditAllocation(id);
      return res.status(200).json({
        message: 'Credit allocation deleted successfully!',
        deleted,
      });
    } catch (error) {
      next(error);
    }
  };

  public updateCreditAllocation = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validatedParams = uuidSchema.parse(req.params);
      const validatedData = updateCreditAllocationSchema.parse(req.body);
      const { id } = validatedParams;
      const updated = await this.creditAllocationService.updateCreditAllocation(id, validatedData);
      return res.status(200).json({
        message: 'Credit allocation updated successfully!',
        updated,
      });
    } catch (error) {
      next(error);
    }
  };
}
