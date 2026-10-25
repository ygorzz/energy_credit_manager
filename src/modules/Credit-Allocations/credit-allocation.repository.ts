import type { Prisma } from '../../db/generated/prisma/client.js';
import { db } from '../../db/prisma.js';

export default class CreditAllocationRepository {
  public create = async (
    data: Prisma.CreditAllocationUncheckedCreateInput,
    tx?: Prisma.TransactionClient,
  ) => {
    const prisma = tx ?? db;
    return await prisma.creditAllocation.create({ data });
  };

  public findAll = async (skip: number, take: number) => {
    // Order by ID for deterministic pages while the underlying data remains unchanged.
    return await db.creditAllocation.findMany({ skip, take, orderBy: { id: 'asc' } });
  };

  public findById = async (id: string, tx?: Prisma.TransactionClient) => {
    const prisma = tx ?? db;
    return await prisma.creditAllocation.findUnique({ where: { id } });
  };

  public findByIdWithCompany = async (id: string, tx: Prisma.TransactionClient) => {
    return await tx.creditAllocation.findUnique({
      where: { id },
      include: { clientCompany: true },
    });
  };

  public update = async (
    id: string,
    data: Prisma.CreditAllocationUncheckedUpdateInput,
    tx?: Prisma.TransactionClient,
  ) => {
    const prisma = tx ?? db;
    return await prisma.creditAllocation.update({ where: { id }, data });
  };

  public delete = async (id: string, tx?: Prisma.TransactionClient) => {
    const prisma = tx ?? db;
    return await prisma.creditAllocation.delete({ where: { id } });
  };
}
