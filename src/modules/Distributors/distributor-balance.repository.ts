import type { Months, Prisma } from '../../db/generated/prisma/client.js';
import { db } from '../../db/prisma.js';

export default class MonthlyDistributorBalanceRepository {
  public upsert = async (
    data: Prisma.MonthlyDistributorBalanceUncheckedCreateInput,
    tx: Prisma.TransactionClient,
  ) => {
    const { distributorId, month, year } = data;
    const energyGeneratedMwh = data.totalEnergyGeneratedMwh ?? 0;
    return await tx.monthlyDistributorBalance.upsert({
      where: { distributorId_year_month: { distributorId, year, month } },
      update: {
        totalEnergyGeneratedMwh: { increment: energyGeneratedMwh },
        avaliableEnergyMwh: { increment: energyGeneratedMwh },
      },
      create: data,
    });
  };

  public findAll = async (skip: number, take: number) => {
    // Order by ID for deterministic pages while the underlying data remains unchanged.
    return await db.monthlyDistributorBalance.findMany({
      skip,
      take,
      orderBy: { id: 'asc' },
    });
  };

  public findById = async (
    distributorId: string,
    year: number,
    month: Months,
    tx?: Prisma.TransactionClient,
  ) => {
    const prisma = tx ?? db;
    return await prisma.monthlyDistributorBalance.findUnique({
      where: {
        distributorId_year_month: {
          distributorId,
          year,
          month,
        },
      },
    });
  };

  public delete = async (id: string) => {
    return await db.monthlyDistributorBalance.delete({
      where: {
        id,
      },
    });
  };

  public update = async (
    distributorId: string,
    year: number,
    month: Months,
    data: Prisma.MonthlyDistributorBalanceUncheckedUpdateInput,
    tx?: Prisma.TransactionClient,
  ) => {
    const prisma = tx ?? db;
    return await prisma.monthlyDistributorBalance.update({
      where: {
        distributorId_year_month: {
          distributorId,
          year,
          month,
        },
      },
      data,
    });
  };
}
