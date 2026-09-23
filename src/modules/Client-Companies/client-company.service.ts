import { Prisma } from "../../db/generated/prisma/client.js";
import { db } from "../../db/prisma.js";
import ConflictError from "../../errors/conflict.error.js";
import NotFoundError from "../../errors/not-found.error.js";
import type {
  createClientCompanyDTO,
  updateClientCompanyDTO,
} from "./client-company.dto.js";

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

  public findAll = async (page: number, limit: number) => {
    const skip = (page - 1) * limit;
    const clientCompanies = await db.clientCompany.findMany({
      skip,
      take: limit,
    });
    return clientCompanies;
  };

  public findById = async (id: string) => {
    const clientCompanyFound = await db.clientCompany.findUnique({
      where: {
        id,
      },
    });

    if (!clientCompanyFound)
      throw new NotFoundError("Client company not found");

    return clientCompanyFound;
  };

  public delete = async (id: string) => {
    try {
      const clientCompanyDeleted = await db.clientCompany.delete({
        where: {
          id,
        },
      });
      return clientCompanyDeleted;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2025") {
          throw new NotFoundError("Client company not found");
        }
      }
      throw error;
    }
  };
  public update = async (id: string, data: updateClientCompanyDTO) => {
    try {
      const newData = Object.fromEntries(
        Object.entries(data).filter((e) => e[1] !== undefined),
      );
      const clientCompanyUpdated = await db.clientCompany.update({
        where: {
          id,
        },
        data: newData,
      });

      return clientCompanyUpdated;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2025") {
          throw new NotFoundError("Client company not found");
        }
        if (error.code === "P2003") {
          throw new NotFoundError("Distributor id not found in the database");
        }
        if (error.code === "P2002") {
          throw new ConflictError(
            "Already exists a client company with this CNPJ",
          );
        }
      }
      throw error;
    }
  };
}
