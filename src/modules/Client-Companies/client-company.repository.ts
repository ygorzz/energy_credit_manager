import { db } from "../../db/prisma.js";
import type {
  createClientCompanyDTO,
  updateClientCompanyDTO,
} from "./client-company.dto.js";


export default class ClientCompanyRepository {
  public create = async (data: createClientCompanyDTO) => {
    return await db.distributor.create({
      data,
    });
  };

  public findAll = async (skip: number, take: number) => {
    return await db.distributor.findMany({
      skip,
      take,
    });
  };

  public findById = async (id: string) => {
    return await db.distributor.findUnique({
      where: {
        id,
      },
    });
  };

  public delete = async (id: string) => {
    return await db.distributor.delete({
      where: {
        id,
      },
    });
  };

  public update = async (id: string, data: updateClientCompanyDTO) => {
    return await db.distributor.update({
      where: {
        id,
      },
      data: {
        data,
      },
    });
  };
}
