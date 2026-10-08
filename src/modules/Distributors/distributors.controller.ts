import type { NextFunction, Request, Response } from 'express';
import { uuidSchema } from '../../shared/schemas/uuid.dto.js';
import type { IdParams } from '../../types.js';
import {
  createDistributorSchema,
  listDistributorsSchema,
  updateDistributorSchema,
} from './distributor.dto.js';
import type DistributorService from './distributor.service.js';

export default class DistributorsController {
  constructor(private distributorService: DistributorService) {}

  public createDistributor = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validatedData = createDistributorSchema.parse(req.body);
      const newDistributor = await this.distributorService.createDistributor(validatedData);
      return res.status(201).json({ message: 'Distributor created successfully!', newDistributor });
    } catch (error) {
      next(error);
    }
  };

  public listDistributors = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { page, limit } = listDistributorsSchema.parse(req.query);
      const distributors = await this.distributorService.listDistributors(page, limit);
      return res.status(200).json(distributors);
    } catch (error) {
      next(error);
    }
  };

  public getDistributorById = async (req: Request<IdParams>, res: Response, next: NextFunction) => {
    try {
      const idValidated = uuidSchema.parse(req.params);
      const { id } = idValidated;
      const distributorFound = await this.distributorService.getDistributorById(id);
      return res.status(200).json(distributorFound);
    } catch (error) {
      next(error);
    }
  };

  // types the Request with the IdParams type for id: string
  public deleteDistributor = async (req: Request<IdParams>, res: Response, next: NextFunction) => {
    try {
      const idValidated = uuidSchema.parse(req.params);
      const { id } = idValidated;
      const distributorDeleted = await this.distributorService.deleteDistributor(id);
      return res.status(200).json({
        message: 'Distributor deleted successfully!',
        distributorDeleted,
      });
    } catch (error) {
      next(error);
    }
  };

  public updateDistributor = async (req: Request<IdParams>, res: Response, next: NextFunction) => {
    try {
      const idValidated = uuidSchema.parse(req.params);
      const { id } = idValidated;
      const validatedData = updateDistributorSchema.parse(req.body);
      const distributorUpdated = await this.distributorService.updateDistributor(id, validatedData);
      return res.status(200).json({
        message: 'Distributor updated successfully!',
        distributorUpdated,
      });
    } catch (error) {
      next(error);
    }
  };
}
