import type { Prisma } from '../../db/generated/prisma/client.js';
import { db } from '../../db/prisma.js';

export default class UserRepository {
  public create = async (data: Prisma.UserUncheckedCreateInput, tx?: Prisma.TransactionClient) => {
    const prisma = tx ?? db;
    return await prisma.user.create({
      data,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        companyId: true,
      },
    });
  };

  public findAll = async (skip: number, take: number) => {
    // Order by ID for deterministic pages while the underlying data remains unchanged.
    return await db.user.findMany({
      skip,
      take,
      orderBy: { id: 'asc' },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        companyId: true,
      },
    });
  };

  public findById = async (id: string, tx?: Prisma.TransactionClient) => {
    const prisma = tx ?? db;
    return await prisma.user.findUnique({
      where: {
        id,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        companyId: true,
      },
    });
  };

  public findByEmail = async (email: string) => {
    return await db.user.findUnique({
      where: {
        email,
      },
    });
  };

  public delete = async (id: string) => {
    return await db.user.delete({
      where: {
        id,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        companyId: true,
      },
    });
  };

  public update = async (
    id: string,
    data: Prisma.UserUncheckedUpdateInput,
    tx?: Prisma.TransactionClient,
  ) => {
    const prisma = tx ?? db;
    return await prisma.user.update({
      where: {
        id,
      },
      data,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        companyId: true,
      },
    });
  };
}
