import type { Prisma } from '../../db/generated/prisma/client.js';
import { db } from '../../db/prisma.js';

export default class ClientCompanyRepository {
  public create = async (data: Prisma.ClientCompanyUncheckedCreateInput) => {
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

  public hasClientUsers = async (id: string, tx: Prisma.TransactionClient) => {
    return (await tx.user.count({ where: { companyId: id, role: 'CLIENT' } })) > 0;
  };

  public delete = async (id: string, tx?: Prisma.TransactionClient) => {
    const prisma = tx ?? db;
    return await prisma.clientCompany.delete({
      where: {
        id,
      },
    });
  };

  public hasCreditAllocations = async (id: string, tx: Prisma.TransactionClient) => {
    return (await tx.creditAllocation.count({ where: { clientCompanyId: id } })) > 0;
  };

  public update = async (
    id: string,
    data: Prisma.ClientCompanyUncheckedUpdateInput,
    tx?: Prisma.TransactionClient,
  ) => {
    const prisma = tx ?? db;
    return await prisma.clientCompany.update({
      where: {
        id,
      },
      data,
    });
  };
}
