import type { NextFunction, Request, Response } from 'express';
import { uuidSchema } from '../../shared/schemas/uuid.dto.js';
import {
  createClientCompanySchema,
  listClientCompaniesSchema,
  updateClientCompanySchema,
} from './client-company.dto.js';
import type ClientCompanyService from './client-company.service.js';

export default class ClientCompaniesController {
  constructor(private clientCompanyService: ClientCompanyService) {}

  // Preserve response keys while using concise local result names.
  public createClientCompany = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validatedData = createClientCompanySchema.parse(req.body);
      const created = await this.clientCompanyService.createClientCompany(validatedData);
      return res.status(201).json({
        message: 'Client Company created succesfully!',
        created,
      });
    } catch (error) {
      next(error);
    }
  };

  public listClientCompanies = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { page, limit } = listClientCompaniesSchema.parse(req.query);
      const companies = await this.clientCompanyService.listClientCompanies(page, limit);
      return res.status(200).json(companies);
    } catch (error) {
      next(error);
    }
  };

  public getClientCompanyById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validatedParams = uuidSchema.parse(req.params);
      const { id } = validatedParams;
      const company = await this.clientCompanyService.getClientCompanyById(id);
      return res.status(200).json(company);
    } catch (error) {
      next(error);
    }
  };

  public deleteClientCompany = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validatedParams = uuidSchema.parse(req.params);
      const { id } = validatedParams;
      const deleted = await this.clientCompanyService.deleteClientCompany(id);
      return res.status(200).json({
        message: 'Client company deleted successfully!',
        deleted,
      });
    } catch (error) {
      next(error);
    }
  };

  public updateClientCompany = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validatedParams = uuidSchema.parse(req.params);
      const validatedData = updateClientCompanySchema.parse(req.body);
      const { id } = validatedParams;
      const updated = await this.clientCompanyService.updateClientCompany(id, validatedData);
      return res.status(200).json({
        message: 'Client company updated successfully!',
        updated,
      });
    } catch (error) {
      next(error);
    }
  };
}
