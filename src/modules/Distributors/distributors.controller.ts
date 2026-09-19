import type { NextFunction, Request, Response } from 'express';
import {
  createDistributorSchema,
  listDistributorsSchema,
  updateDistributorSchema,
} from './distributor.dto.js';
import type DistributorService from './distributor.service.js';
import type { IdParams } from '../../types.js';

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

  public listDistributors = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { page, limit } = listDistributorsSchema.parse(req.query);
      const distributors = await this.distributorService.findAll(page, limit);
      return res.status(200).json(distributors);
    } catch (error) {
      next(error);
    }
  };

  public getDistributorById = async (
    req: Request<IdParams>,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const { id } = req.params;
      const distributorFound = await this.distributorService.findById(id);
      return res.status(200).json(distributorFound);
    } catch (error) {
      next(error);
    }
  };

  // types the Request with the IdParams type for id: string
  public deleteDistributor = async (
    req: Request<IdParams>,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const { id } = req.params;
      const distributorDeleted = await this.distributorService.delete(id);
      return res
        .status(200)
        .json({ message: 'Distributor deleted successfully!', distributorDeleted });
    } catch (error) {
      next(error);
    }
  };

  public updateDistributor = async (
    req: Request<IdParams>,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const { id } = req.params;
      const validatedData = updateDistributorSchema.parse(req.body);
      const distributorUpdated = await this.distributorService.update(id, validatedData);
      return res
        .status(200)
        .json({ message: 'Distributor updated successfully!', distributorUpdated });
    } catch (error) {
      next(error);
    }
  };
}
