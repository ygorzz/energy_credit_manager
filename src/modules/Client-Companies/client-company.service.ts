import { Prisma } from "../../db/generated/prisma/client.js";
import { db } from "../../db/prisma.js";
import ConflictError from "../../errors/conflict.error.js";
import NotFoundError from "../../errors/not-found.error.js";
import type { createClientCompanyDTO } from "./client-company.dto.js";

export default class ClientCompanyService {
  public create = async (data: createClientCompanyDTO) => {
    try {
      // CNPJ VALIDATION -> math calculation

      const newClientCompany = await db.clientCompany.create({
        data,
      });
      return newClientCompany;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2002") {
          throw new ConflictError(
            "Already exists a client company with this CNPJ",
          );
        }
        if (error.code === "P2003") {
          throw new NotFoundError("Distributor not found in the database");
        }
      }
    }
  };
}
