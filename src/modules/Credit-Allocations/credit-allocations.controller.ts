import type { NextFunction, Request, Response } from "express";
import { uuidSchema } from "../../shared/schemas/uuid.dto.js";
import type CreditAllocationService from "./credit-allocation.service.js";
import { createCreditAllocationSchema } from "./credit-allocation.dto.js";

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

//   public listClientCompanies = async (
//     req: Request,
//     res: Response,
//     next: NextFunction,
//   ) => {
//     try {
//       const { page, limit } = listClientCompaniesSchema.parse(req.query);
//       const clientCompanies = await this.creditAllocationService.findAll(
//         page,
//         limit,
//       );
//       return res.status(200).json(clientCompanies);
//     } catch (error) {
//       next(error);
//     }
//   };

//   public getClientCompanyById = async (
//     req: Request,
//     res: Response,
//     next: NextFunction,
//   ) => {
//     try {
//       const idValidated = uuidSchema.parse(req.params);
//       const { id } = idValidated;
//       const clientCompanyFound = await this.creditAllocationService.findById(id);
//       return res.status(200).json(clientCompanyFound);
//     } catch (error) {
//       next(error);
//     }
//   };

//   public deleteClientCompany = async (
//     req: Request,
//     res: Response,
//     next: NextFunction,
//   ) => {
//     try {
//       const idValidated = uuidSchema.parse(req.params);
//       const { id } = idValidated;
//       const clientCompanyDeleted = await this.creditAllocationService.delete(id);
//       return res.status(200).json({
//         message: "Client company deleted successfully!",
//         clientCompanyDeleted,
//       });
//     } catch (error) {
//       next(error);
//     }
//   };

//   public updateClientCompany = async (
//     req: Request,
//     res: Response,
//     next: NextFunction,
//   ) => {
//     try {
//       const idValidated = uuidSchema.parse(req.params);
//       const validatedData = updateClientCompanySchema.parse(req.body);
//       const { id } = idValidated;
//       const clientCompanyUpdated = await this.creditAllocationService.update(
//         id,
//         validatedData,
//       );
//       return res.status(200).json({
//         message: "Client company updated successfully!",
//         clientCompanyUpdated,
//       });
//     } catch (error) {
//       next(error);
//     }
//   };
}
