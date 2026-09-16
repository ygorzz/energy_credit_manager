import { Prisma } from '../../db/generated/prisma/client.js';
import { db } from '../../db/prisma.js';
import ConflictError from '../../errors/conflict.error.js';
import NotFoundError from '../../errors/not-found.error.js';
import type { CreateDistributorDTO, UpdateDistributorDTO } from './distributor.dto.js';

export default class DistributorService {
  public create = async (data: CreateDistributorDTO) => {
    try {
      data.name = data.name.trim().toUpperCase();
      const newDistributor = await db.distributor.create({
        data,
      });
      return newDistributor;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ConflictError('Already exists a distributor with this name');
        }
      }
    }
  };

  public delete = async (id: string) => {
    try {
      const distributorDeleted = await db.distributor.delete({
        where: {
          id,
        },
      });

      return distributorDeleted;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new NotFoundError('Distributor not found');
        }
      }
    }
  };

  public update = async (id: string, data: UpdateDistributorDTO) => {
    try {
      const newData = data.name === undefined ? {} : { name: data.name.trim().toUpperCase() };
      const distributorUpdated = await db.distributor.update({
        where: {
          id,
        },
        data: newData,
      });

      return distributorUpdated;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new NotFoundError('Distributor not found');
        }
      }
    }
  };
}
