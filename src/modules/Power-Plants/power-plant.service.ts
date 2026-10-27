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
      this.rethrowWriteError(error, 'create');
    }
  };

  public listPowerPlants = async (page: number, limit: number) => {
    const skip = (page - 1) * limit;
    return await this.powerPlantRepository.findAll(skip, limit);
  };

  public getPowerPlantById = async (id: string) => {
    const plant = await this.powerPlantRepository.findById(id);

    if (!plant) throw new NotFoundError('Power Plant not found');

    return plant;
  };

  public deletePowerPlant = async (id: string) => {
    try {
      return await this.powerPlantRepository.delete(id);
    } catch (error) {
      this.rethrowWriteError(error, 'delete');
    }
  };

  public updatePowerPlant = async (id: string, data: updatePowerPlantDTO) => {
    try {
      const newData = Object.fromEntries(
        Object.entries(data).filter((entry) => entry[1] !== undefined),
      );
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
      this.rethrowWriteError(error, 'update');
    }
  };

  // References and deletion dependencies require different responses for the same database code.
  private rethrowWriteError(error: unknown, operation: 'create' | 'update' | 'delete'): never {
    if (isTransactionConflict(error)) {
      throw new ConflictError('The energy data changed concurrently. Please retry.');
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025' && operation !== 'create') {
        throw new NotFoundError('Power plant not found');
      }
      if (error.code === 'P2003') {
        // Generation history prevents deleting the plant that owns it.
        if (operation === 'delete') {
          throw new ConflictError('Cannot delete a power plant with generation history');
        }
        // A plant can only be created under an existing distributor.
        throw new NotFoundError(
          operation === 'create'
            ? 'Distributor not found in the database'
            : 'Distributor id not found in the database',
        );
      }
      if (error.code === 'P2002' && operation !== 'delete') {
        throw new ConflictError(
          operation === 'create'
            ? 'Already exists a power plant with this name'
            : 'Already exits a power plant with this name',
        );
      }
    }
    throw error;
  }
}
