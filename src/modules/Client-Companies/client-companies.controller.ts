import type { NextFunction, Request, Response } from "express";
import type ClientCompanyService from "./client-company.service.js";
import {
  createClientCompanySchema,
  listClientCompaniesSchema,
  updateClientCompanySchema,
} from "./client-company.dto.js";
import { uuidSchema } from "../../shared/schemas/uuid.dto.js";

export default class ClientCompaniesController {
  constructor(private clientCompanyService: ClientCompanyService) {}

  public createClientCompany = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const validatedData = createClientCompanySchema.parse(req.body);
      const newClientCompany =
        await this.clientCompanyService.create(validatedData);
      return res.status(201).json({
        message: "Client Company created succesfully!",
        newClientCompany,
      });
    } catch (error) {
      next(error);
    }
  };

  public listClientCompanies = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const { page, limit } = listClientCompaniesSchema.parse(req.query);
      const clientCompanies = await this.clientCompanyService.findAll(
        page,
        limit,
      );
      return res.status(200).json(clientCompanies);
    } catch (error) {
      next(error);
    }
  };

  public getClientCompanyById = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const idValidated = uuidSchema.parse(req.params);
      const { id } = idValidated;
      const clientCompanyFound = await this.clientCompanyService.findById(id);
      return res.status(200).json(clientCompanyFound);
    } catch (error) {
      next(error);
    }
  };

  public deleteClientCompany = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const idValidated = uuidSchema.parse(req.params);
      const { id } = idValidated;
      const clientCompanyDeleted = await this.clientCompanyService.delete(id);
      return res.status(200).json({
        message: "Client company deleted successfully!",
        clientCompanyDeleted,
      });
    } catch (error) {
      next(error);
    }
  };

  public updateClientCompany = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const idValidated = uuidSchema.parse(req.params);
      const validatedData = updateClientCompanySchema.parse(req.body);
      const { id } = idValidated;
      const clientCompanyUpdated = await this.clientCompanyService.update(
        id,
        validatedData,
      );
      return res.status(200).json({
        message: "Client company updated successfully!",
        clientCompanyUpdated,
      });
    } catch (error) {
      next(error);
    }
  };
}
