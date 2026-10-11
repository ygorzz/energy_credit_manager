import type { Prisma } from '../../db/generated/prisma/client.js';
import { db } from '../../db/prisma.js';
import type {
  CreateMonthlyGenerationDTO,
  UpdateMonthlyGenerationDTO,
} from './monthly-generation.dto.js';

export default class MonthlyGenerationRepository {
  public create = async (data: CreateMonthlyGenerationDTO, tx?: Prisma.TransactionClient) => {
    const prisma = tx ?? db;
    return await prisma.monthlyGeneration.create({
      data,
    });
  };

  public findAll = async (skip: number, take: number) => {
    return await db.monthlyGeneration.findMany({
      skip,
      take,
    });
  };

  public findById = async (id: string) => {
    return await db.monthlyGeneration.findUnique({
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
    data: UpdateMonthlyGenerationDTO,
    tx?: Prisma.TransactionClient,
  ) => {
    const prisma = tx ?? db;
    return await prisma.monthlyGeneration.update({
      where: {
        id,
      },
      data: {
        data,
      },
    });
  };
}

