import type { Prisma } from '../../db/generated/prisma/client.js';
import { db } from '../../db/prisma.js';

export default class PowerPlantRepository {
  public create = async (data: Prisma.PowerPlantUncheckedCreateInput) => {
    return await db.powerPlant.create({
      data,
    });
  };

  public findAll = async (skip: number, take: number) => {
    // Order by ID for deterministic pages while the underlying data remains unchanged.
    return await db.powerPlant.findMany({
      skip,
      take,
      orderBy: { id: 'asc' },
    });
  };

  // tx for $transactions
  public findById = async (id: string, tx?: Prisma.TransactionClient) => {
    const prisma = tx ?? db;
    return await prisma.powerPlant.findUnique({
      where: {
        id,
      },
    });
  };

  public delete = async (id: string) => {
    return await db.powerPlant.delete({
      where: {
        id,
      },
    });
  };

  public hasMonthlyGenerations = async (id: string, tx: Prisma.TransactionClient) => {
    return (await tx.monthlyGeneration.count({ where: { powerPlantId: id } })) > 0;
  };

  public update = async (
    id: string,
    data: Prisma.PowerPlantUncheckedUpdateInput,
    tx?: Prisma.TransactionClient,
  ) => {
    const prisma = tx ?? db;
    return await prisma.powerPlant.update({
      where: {
        id,
      },
      data,
    });
  };
}
