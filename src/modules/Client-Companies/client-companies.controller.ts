import type { NextFunction, Request, Response } from "express";
import type ClientCompanyService from "./client-company.service.js";
import { createClientCompanySchema } from "./client-company.dto.js";

export default class ClientCompaniesController {
  constructor(private clientCompanyService: ClientCompanyService) {}

  public createClientCompany = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const validatedData = createClientCompanySchema.parse(req.body);
      const newClientCompany = await this.clientCompanyService.create(validatedData);
      return res.status(201).json({
        message: "Client Company created succesfully!",
        newClientCompany,
      });
    } catch (error) {
      next(error);
    }
  };
}
