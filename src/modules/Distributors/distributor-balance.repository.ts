import type { Months, Prisma } from '../../db/generated/prisma/client.js';
import { db } from '../../db/prisma.js';
import type {
  CreateMonthlyGenerationDTO,
  UpdateMonthlyGenerationDTO,
} from '../Monthly-Generations/monthly-generation.dto.js';

export default class MonthlyDistributorBalanceRepository {
  public upsert = async (
    distributorId: string,
    data: CreateMonthlyGenerationDTO,
    tx: Prisma.TransactionClient,
  ) => {
    const { month, year } = data;
    await tx.monthlyDistributorBalance.upsert({
      where: {
        // Prisma requires a query using only one line, so we use the composting unique key: distributorId_year_month
        distributorId_year_month: {
          distributorId,
          year,
          month,
        },
      },
      // if record already exists
      update: {
        totalEnergyGeneratedMwh: {
          increment: data.energyGeneratedMwh,
        },
        avaliableEnergyMwh: {
          increment: data.energyGeneratedMwh,
        },
      },
      // if record does not exists
      create: {
        year,
        month,
        totalEnergyGeneratedMwh: data.energyGeneratedMwh,
        totalEnergyAllocatedMwh: 0,
        avaliableEnergyMwh: data.energyGeneratedMwh,
        distributorId,
      },
    });
  };

  public findAll = async (skip: number, take: number) => {
    return await db.monthlyDistributorBalance.findMany({
      skip,
      take,
    });
  };

  public findById = async (distributorId: string, year: number, month: Months) => {
    return await db.monthlyDistributorBalance.findUnique({
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
    energyAdjustment: EnergyAdjustmentType,
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
      data: {
        totalEnergyGeneratedMwh: energyAdjustment,
        avaliableEnergyMwh: energyAdjustment,
      },
    });
  };
}

interface EnergyAdjustmentType {
  increment?: number;
  decrement?: number;
}
