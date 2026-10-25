import { Prisma } from '../../db/generated/prisma/client.js';
import isTransactionConflict from '../../db/is-transaction-conflict.js';
import { db } from '../../db/prisma.js';
import BadRequestError from '../../errors/bad-request.error.js';
import ConflictError from '../../errors/conflict.error.js';
import NotFoundError from '../../errors/not-found.error.js';
import type MonthlyDistributorBalanceRepository from '../Distributors/distributor-balance.repository.js';
import type PowerPlantRepository from '../Power-Plants/power-plant.repository.js';
import type {
  CreateMonthlyGenerationDTO,
  UpdateMonthlyGenerationDTO,
} from './monthly-generation.dto.js';
import type MonthlyGenerationRepository from './monthly-generation.repository.js';

export default class MonthlyGenerationService {
  constructor(
    private monthlyGenerationRepository: MonthlyGenerationRepository,
    private powerPlantRepository: PowerPlantRepository,
    private monthlyDistributorBalanceRepository: MonthlyDistributorBalanceRepository,
  ) {}

  public createMonthlyGeneration = async (data: CreateMonthlyGenerationDTO) => {
    try {
      // Read and write generation and balances in one transaction to protect concurrent operations.
      return await db.$transaction(
        async (tx) => {
          // 1 - Get the distributorId for upsert monthly distributor balance
          const plant = await this.powerPlantRepository.findById(data.powerPlantId, tx);
          if (!plant) throw new NotFoundError('Power plant id not found');
          const generation = await this.monthlyGenerationRepository.create(data, tx);
          // 2 - Creates/updates the monthly distributor balance record
          await this.monthlyDistributorBalanceRepository.upsert(
            {
              distributorId: plant.distributorId,
              month: data.month,
              year: data.year,
              totalEnergyGeneratedMwh: data.energyGeneratedMwh,
              totalEnergyAllocatedMwh: 0,
              avaliableEnergyMwh: data.energyGeneratedMwh,
            },
            tx,
          );
          return generation;
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error) {
      this.rethrowWriteError(error);
    }
  };

  public listMonthlyGenerations = async (page: number, limit: number) => {
    return await this.monthlyGenerationRepository.findAll((page - 1) * limit, limit);
  };

  public getMonthlyGenerationById = async (id: string) => {
    const generation = await this.monthlyGenerationRepository.findById(id);
    if (!generation) throw new NotFoundError('Monthly generation not found');
    return generation;
  };

  public deleteMonthlyGeneration = async (id: string) => {
    try {
      // Validate and delete generation in the same transaction as the balance adjustment.
      return await db.$transaction(
        async (tx) => {
          // 1 - Find the monthly generation by id to get distributorId, month and year
          const generation = await this.monthlyGenerationRepository.findById(id, tx);
          if (!generation) throw new NotFoundError('Monthly generation not found');
          const { powerPlant, month, year, energyGeneratedMwh } = generation;
          // 2 - Find the monthly distributor balance by distributorId, year and month
          const balance = await this.monthlyDistributorBalanceRepository.findById(
            powerPlant.distributorId,
            year,
            month,
            tx,
          );
          if (!balance) throw new NotFoundError('Monthly distributor balance not found');
          // 3 - Check if the energy to remove is greater than the available energy
          if (energyGeneratedMwh.greaterThan(balance.avaliableEnergyMwh)) {
            throw new BadRequestError(
              'Cannot delete generation because credits already use this energy.',
            );
          }
          // 4 - Delete the monthly generation and update the monthly distributor balance
          const deleted = await this.monthlyGenerationRepository.delete(id, tx);
          // Keep balance adjustments as Decimal values to avoid precision loss.
          const adjustment = { decrement: energyGeneratedMwh };
          await this.monthlyDistributorBalanceRepository.update(
            powerPlant.distributorId,
            year,
            month,
            {
              totalEnergyGeneratedMwh: adjustment,
              avaliableEnergyMwh: adjustment,
            },
            tx,
          );
          return deleted;
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error) {
      this.rethrowWriteError(error);
    }
  };

  public updateMonthlyGeneration = async (id: string, data: UpdateMonthlyGenerationDTO) => {
    try {
      // Validate and write source, destination and balances within the same transaction.
      return await db.$transaction(
        async (tx) => {
          // 1 - Find the monthly generation by id
          const generation = await this.monthlyGenerationRepository.findById(id, tx);
          if (!generation) throw new NotFoundError('Monthly generation not found');
          const newData = Object.fromEntries(
            Object.entries(data).filter((entry) => entry[1] !== undefined),
          );
          // Keep calculations and adjustments in Decimal without converting to Number.
          const oldEnergy = new Prisma.Decimal(generation.energyGeneratedMwh);
          const newEnergy = new Prisma.Decimal(data.energyGeneratedMwh ?? oldEnergy);
          const oldDistributorId = generation.powerPlant.distributorId; // for update monthly distributor balance
          const month = data.month ?? generation.month;
          const year = data.year ?? generation.year;
          // 2 - Resolve the new distributor when the power plant changes
          let distributorId = oldDistributorId;
          // 2.2 - If the power plant changes, get the new distributorId
          if (data.powerPlantId && data.powerPlantId !== generation.powerPlantId) {
            const plant = await this.powerPlantRepository.findById(data.powerPlantId, tx);
            if (!plant) throw new NotFoundError('Power plant id not found');
            distributorId = plant.distributorId;
          }
          const balance = await this.monthlyDistributorBalanceRepository.findById(
            oldDistributorId,
            generation.year,
            generation.month,
            tx,
          );
          if (!balance) throw new NotFoundError('Monthly distributor balance not found');
          // 3 - Check if the distributor, month and year are the same
          const sameBalance =
            distributorId === oldDistributorId &&
            year === generation.year &&
            month === generation.month;
          // 4 - If the distributor, month and year are the same, apply energy delta on the existing balance
          // delta -> newEnergy - oldEnergy
          if (sameBalance) {
            const delta = newEnergy.sub(oldEnergy);
            if (delta.isZero())
              return await this.monthlyGenerationRepository.update(id, newData, tx);
            // 4.1 - if it will remove energy, check if there is enough energy to remove
            if (delta.isNegative() && delta.abs().greaterThan(balance.avaliableEnergyMwh)) {
              throw new BadRequestError(
                'Cannot reduce generation below the energy already allocated.',
              );
            }
            const adjustment = delta.isPositive()
              ? { increment: delta }
              : { decrement: delta.abs() };
            await this.monthlyGenerationRepository.update(id, newData, tx);
            await this.monthlyDistributorBalanceRepository.update(
              distributorId,
              year,
              month,
              {
                totalEnergyGeneratedMwh: adjustment,
                avaliableEnergyMwh: adjustment,
              },
              tx,
            );
            return;
          }
          // 4 - If the distributor/month/year are different: remove energy from the old balance
          // if the energy to remove is greater than monthly balance avaliable energy
          if (oldEnergy.greaterThan(balance.avaliableEnergyMwh)) {
            throw new BadRequestError(
              'Cannot move generation because credits already use this energy.',
            );
          }
          // 5 - Move energy to the new monthly distributor balance
          // 5.1 update old monthly generation e monthly distributor balance
          const updated = await this.monthlyGenerationRepository.update(id, newData, tx);
          const adjustment = { decrement: oldEnergy };
          await this.monthlyDistributorBalanceRepository.update(
            oldDistributorId,
            generation.year,
            generation.month,
            {
              totalEnergyGeneratedMwh: adjustment,
              avaliableEnergyMwh: adjustment,
            },
            tx,
          );
          // 5.2 upsert monthly distributor balance
          await this.monthlyDistributorBalanceRepository.upsert(
            {
              distributorId,
              month,
              year,
              totalEnergyGeneratedMwh: newEnergy,
              totalEnergyAllocatedMwh: 0,
              avaliableEnergyMwh: newEnergy,
            },
            tx,
          );
          return updated;
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error) {
      this.rethrowWriteError(error);
    }
  };

  private rethrowWriteError(error: unknown): never {
    if (isTransactionConflict(error)) {
      throw new ConflictError('The generation or balance changed concurrently. Please retry.');
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025') throw new NotFoundError('Monthly generation not found');
      if (error.code === 'P2003') throw new NotFoundError('Power plant not found in the database');
      if (error.code === 'P2002') throw new ConflictError('Monthly generation already exists');
    }
    throw error;
  }
}
