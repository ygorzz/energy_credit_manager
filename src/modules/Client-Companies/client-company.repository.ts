import type { Prisma } from '../../db/generated/prisma/client.js';
import { db } from '../../db/prisma.js';
import type { createClientCompanyDTO, updateClientCompanyDTO } from './client-company.dto.js';

export default class ClientCompanyRepository {
  public create = async (data: createClientCompanyDTO) => {
    return await db.clientCompany.create({
      data,
    });
  };

  public findAll = async (skip: number, take: number) => {
    return await db.clientCompany.findMany({
      skip,
      take,
    });
  };

  public findById = async (id: string, tx?: Prisma.TransactionClient) => {
    const prisma = tx ?? db;
    return await prisma.clientCompany.findUnique({
      where: {
        id,
      },
    });
  };

  public delete = async (id: string) => {
    return await db.clientCompany.delete({
      where: {
        id,
      },
    });
  };

  public update = async (id: string, data: updateClientCompanyDTO) => {
    return await db.clientCompany.update({
      where: {
        id,
      },
      data: {
        data,
      },
    });
  };
}
