import type { Prisma } from '../../db/generated/prisma/client.js';
import { db } from '../../db/prisma.js';

export default class DistributorRepository {
  public create = async (data: Prisma.DistributorUncheckedCreateInput) => {
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

  public update = async (id: string, data: Prisma.DistributorUncheckedUpdateInput) => {
    return await db.distributor.update({
      where: {
        id,
      },
      data,
    });
  };
}
