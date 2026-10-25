import { Prisma } from '../../db/generated/prisma/client.js';
import isTransactionConflict from '../../db/is-transaction-conflict.js';
import { db } from '../../db/prisma.js';
import ConflictError from '../../errors/conflict.error.js';
import NotFoundError from '../../errors/not-found.error.js';
import type { createPowerPlantDTO, updatePowerPlantDTO } from './power-plant.dto.js';
import type PowerPlantRepository from './power-plant.repository.js';

export default class PowerPlantService {
  constructor(private powerPlantRepository: PowerPlantRepository) {}
  public createPowerPlant = async (data: createPowerPlantDTO) => {
    try {
      return await this.powerPlantRepository.create(data);
    } catch (error) {
      if (isTransactionConflict(error)) {
        throw new ConflictError('The energy data changed concurrently. Please retry.');
      }
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ConflictError('Already exists a power plant with this name');
        }
      }
      throw error;
    }
  };

  public listPowerPlants = async (page: number, limit: number) => {
    const skip = (page - 1) * limit;
    return await this.powerPlantRepository.findAll(skip, limit);
  };

  public getPowerPlantById = async (id: string) => {
    const powerPlantFound = await this.powerPlantRepository.findById(id);

    if (!powerPlantFound) throw new NotFoundError('Power Plant not found');

    return powerPlantFound;
  };

  public deletePowerPlant = async (id: string) => {
    try {
      return await this.powerPlantRepository.delete(id);
    } catch (error) {
      if (isTransactionConflict(error)) {
        throw new ConflictError('The energy data changed concurrently. Please retry.');
      }
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new NotFoundError('Power plant not found');
        }
      }
      throw error;
    }
  };

  public updatePowerPlant = async (id: string, data: updatePowerPlantDTO) => {
    try {
      const newData = Object.fromEntries(Object.entries(data).filter((e) => e[1] !== undefined));
      return await db.$transaction(
        async (tx) => {
          const plant = await this.powerPlantRepository.findById(id, tx);
          if (!plant) throw new NotFoundError('Power plant not found');
          // Plants with generation records keep their distributor to preserve historical ownership.
          if (
            data.distributorId !== undefined &&
            data.distributorId !== plant.distributorId &&
            (await this.powerPlantRepository.hasMonthlyGenerations(id, tx))
          ) {
            throw new ConflictError(
              'Cannot change distributor of a power plant with generation history',
            );
          }
          return await this.powerPlantRepository.update(id, newData, tx);
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error) {
      if (isTransactionConflict(error)) {
        throw new ConflictError('The energy data changed concurrently. Please retry.');
      }
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new NotFoundError('Power plant not found');
        }
        if (error.code === 'P2003') {
          throw new NotFoundError('Distributor id not found in the database');
        }
        if (error.code === 'P2002') {
          throw new ConflictError('Already exits a power plant with this name');
        }
      }
      throw error;
    }
  };
}
