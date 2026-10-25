import type { Prisma } from '../../db/generated/prisma/client.js';
import { db } from '../../db/prisma.js';

export default class MonthlyGenerationRepository {
  public create = async (
    data: Prisma.MonthlyGenerationUncheckedCreateInput,
    tx?: Prisma.TransactionClient,
  ) => {
    const prisma = tx ?? db;
    return await prisma.monthlyGeneration.create({
      data,
    });
  };

  public findAll = async (skip: number, take: number) => {
    // Order by ID for deterministic pages while the underlying data remains unchanged.
    return await db.monthlyGeneration.findMany({
      skip,
      take,
      orderBy: { id: 'asc' },
    });
  };

  public findById = async (id: string, tx?: Prisma.TransactionClient) => {
    const prisma = tx ?? db;
    return await prisma.monthlyGeneration.findUnique({
      where: {
        id,
      },
      include: {
        powerPlant: true,
      },
    });
  };

  public delete = async (id: string, tx?: Prisma.TransactionClient) => {
    const prisma = tx ?? db;
    return await prisma.monthlyGeneration.delete({
      where: {
        id,
      },
    });
  };

  public update = async (
    id: string,
    data: Prisma.MonthlyGenerationUncheckedUpdateInput,
    tx?: Prisma.TransactionClient,
  ) => {
    const prisma = tx ?? db;
    return await prisma.monthlyGeneration.update({
      where: {
        id,
      },
      data,
    });
  };
}
