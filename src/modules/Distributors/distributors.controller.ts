import type { NextFunction, Request, Response } from 'express';
import { createDistributorSchema, updateDistributorSchema } from './distributor.dto.js';
import type DistributorService from './distributor.service.js';
import type { DistributorIdParams } from './distributors.types.js';

export default class DistributorsController {
  constructor(private distributorService: DistributorService) {}

  public createDistributor = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validatedData = createDistributorSchema.parse(req.body);
      const newDistributor = await this.distributorService.create(validatedData);
      return res.status(201).json({ message: 'Distributor created successfully!', newDistributor });
    } catch (error) {
      next(error);
    }
  };

  // types the Request with the DistributorIdParams type
  public deleteDistributor = async (
    req: Request<DistributorIdParams>,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const { id } = req.params;
      const distributorDeleted = await this.distributorService.delete(id);
      return res
        .status(201)
        .json({ message: 'Distributor deleted successfully!', distributorDeleted });
    } catch (error) {
      next(error);
    }
  };

  public updateDistributor = async (
    req: Request<DistributorIdParams>,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const { id } = req.params;
      const validatedData = updateDistributorSchema.parse(req.body)
      const distributorUpdated = await this.distributorService.update(id, validatedData);
      return res
        .status(201)
        .json({ message: 'Distributor updated successfully!', distributorUpdated });
    } catch (error) {
      next(error);
    }
  };
}
