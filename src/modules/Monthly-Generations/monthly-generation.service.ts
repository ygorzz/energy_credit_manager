import { Prisma } from '../../db/generated/prisma/client.js';
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
      return await db.$transaction(async (tx) => {
        // 1 - Get the distributorId for upsert monthly distributor balance
        const powerPlant = await this.powerPlantRepository.findById(data.powerPlantId, tx);
        if (!powerPlant) throw new NotFoundError('Power plant id not found');

        const generation = await this.monthlyGenerationRepository.create(data, tx);

        // 2 - Creates/updates the monthly distributor balance record
        const { distributorId } = powerPlant;
        await this.monthlyDistributorBalanceRepository.upsert(distributorId, data, tx);

        return generation;
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2003') {
          throw new NotFoundError('Power plant not found in the database');
        }
        if (error.code === 'P2002') {
          throw new ConflictError('Already exits a register with these data');
        }
      }
      throw error;
    }
  };

  public listMonthlyGenerations = async (page: number, limit: number) => {
    const skip = (page - 1) * limit;
    return await this.monthlyGenerationRepository.findAll(skip, limit);
  };

  public getMonthlyGenerationById = async (id: string) => {
    const monthlyGenerationFound = await this.monthlyGenerationRepository.findById(id);

    if (!monthlyGenerationFound) throw new NotFoundError('Monthly generation not found');

    return monthlyGenerationFound;
  };

  public deleteMonthlyGeneration = async (id: string) => {
    try {
      // 1 - Find the monthly generation by id to get distributorId, month and year
      const monthlyGeneration = await this.monthlyGenerationRepository.findById(id);
      if (!monthlyGeneration) {
        throw new NotFoundError('Monthly Generation not found');
      }

      const { powerPlant, month, year, energyGeneratedMwh } = monthlyGeneration;

      // 2 - Find the monthly distributor balance by distributorId, year and month
      const { distributorId } = powerPlant;
      const monthlyDistributorBalance = await this.monthlyDistributorBalanceRepository.findById(
        distributorId,
        year,
        month,
      );
      if (!monthlyDistributorBalance) {
        throw new NotFoundError('Monthly distributor balance not found');
      }

      // 3 - Check if the energy to remove is greater than the available energy
      const energyToRemove = energyGeneratedMwh;

      if (energyToRemove.greaterThan(monthlyDistributorBalance.avaliableEnergyMwh)) {
        throw new BadRequestError(
          'Cannot delete this generation because allocated credits exceed the remaining available energy.',
        );
      }

      // 4 - Delete the monthly generation and update the monthly distributor balance
      const energyAdjustment = {
        decrement: Number(energyGeneratedMwh),
      };

      const monthlyGenerationDeleted = await db.$transaction(async (tx) => {
        const generationDeleted = await this.monthlyGenerationRepository.delete(id, tx);
        await this.monthlyDistributorBalanceRepository.update(
          distributorId,
          year,
          month,
          energyAdjustment,
          tx,
        );
        return generationDeleted;
      });

      return monthlyGenerationDeleted;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new NotFoundError('Monthly Generation not found');
        }
      }
      throw error;
    }
  };

  public updateMonthlyGeneration = async (id: string, data: UpdateMonthlyGenerationDTO) => {
    try {
      const newData = Object.fromEntries(Object.entries(data).filter((e) => e[1] !== undefined));

      // 1 - Find the monthly generation by id
      const monthlyGeneration = await this.monthlyGenerationRepository.findById(id);
      if (!monthlyGeneration) {
        throw new NotFoundError('Monthly generation not found');
      }

      const oldEnergy = new Prisma.Decimal(monthlyGeneration.energyGeneratedMwh);
      const newEnergy = new Prisma.Decimal(
        data.energyGeneratedMwh ?? monthlyGeneration.energyGeneratedMwh,
      );
      const oldMonth = monthlyGeneration.month;
      const oldYear = monthlyGeneration.year;
      const newMonth = data.month ?? oldMonth;
      const newYear = data.year ?? oldYear;
      const oldPowerPlantId = monthlyGeneration.powerPlantId;
      const oldDistributorId = monthlyGeneration.powerPlant.distributorId; // for update monthly distributor balance

      // 2 - Resolve the new distributor when the power plant changes
      let newDistributorId = oldDistributorId;
      // 2.2 - If the power plant changes, get the new distributorId
      if (data.powerPlantId && data.powerPlantId !== oldPowerPlantId) {
        const newPowerPlant = await this.powerPlantRepository.findById(data.powerPlantId);
        if (!newPowerPlant) throw new NotFoundError('Power plant id not found');
        newDistributorId = newPowerPlant.distributorId;
      }

      // 3 - Check if the distributor, month and year are the same
      const sameBalanceKey =
        oldDistributorId === newDistributorId && oldMonth === newMonth && oldYear === newYear;

      // 4 - If the distributor, month and year are the same, apply energy delta on the existing balance
      // delta -> newEnergy - oldEnergy
      if (sameBalanceKey) {
        const energyDelta = newEnergy.sub(oldEnergy);

        if (!energyDelta.isZero()) {
          const monthlyDistributorBalance = await this.monthlyDistributorBalanceRepository.findById(
            oldDistributorId,
            oldYear,
            oldMonth,
          );
          if (!monthlyDistributorBalance) {
            throw new NotFoundError('Monthly distributor balance not found');
          }

          // 4.1 - if it will remove energy, check if there is enough energy to remove
          if (
            energyDelta.isNegative() &&
            energyDelta.abs().greaterThan(monthlyDistributorBalance.avaliableEnergyMwh)
          ) {
            throw new BadRequestError(
              'Cannot update this generation because allocated credits exceed the remaining available energy.',
            );
          }

          const energyAdjustment = energyDelta.isPositive()
            ? { increment: Number(energyDelta) }
            : { decrement: Number(energyDelta.abs()) };

          return await db.$transaction(async (tx) => {
            await this.monthlyGenerationRepository.update(id, newData, tx);

            await this.monthlyDistributorBalanceRepository.update(
              oldDistributorId,
              oldYear,
              oldMonth,
              energyAdjustment,
              tx,
            );
          });
        }

        return await this.monthlyGenerationRepository.update(id, newData);
      }

      // 4 - If the distributor/month/year are different: remove energy from the old balance
      const oldMonthlyDistributorBalance = await this.monthlyDistributorBalanceRepository.findById(
        oldDistributorId,
        oldYear,
        oldMonth,
      );
      if (!oldMonthlyDistributorBalance) {
        throw new NotFoundError('Monthly distributor balance not found');
      }
      // if the energy to remove is greater than monthly balance avaliable energy
      if (oldEnergy.greaterThan(oldMonthlyDistributorBalance.avaliableEnergyMwh)) {
        throw new BadRequestError(
          'Cannot update this generation because allocated credits exceed the remaining available energy.',
        );
      }

      // 5 - Move energy to the new monthly distributor balance
      return await db.$transaction(async (tx) => {
        // 5.1 update old monthly generation e monthly distributor balance
        const monthlyGenerationUpdated = await this.monthlyGenerationRepository.update(
          id,
          newData,
          tx,
        );

        const energyAdjustment = {
          decrement: Number(oldEnergy),
        };

        await this.monthlyDistributorBalanceRepository.update(
          oldDistributorId,
          oldYear,
          oldMonth,
          energyAdjustment,
          tx,
        );

        // 5.2 upsert monthly distributor balance
        const distributorBalanceData: CreateMonthlyGenerationDTO = {
          year: newYear,
          month: newMonth,
          energyGeneratedMwh: Number(newEnergy),
          powerPlantId: data.powerPlantId ?? oldPowerPlantId,
        };

        await this.monthlyDistributorBalanceRepository.upsert(
          newDistributorId,
          distributorBalanceData,
          tx,
        );

        return monthlyGenerationUpdated;
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new NotFoundError('Monthly generation not found');
        }
        if (error.code === 'P2003') {
          throw new NotFoundError('Power plant not found in the database');
        }
        if (error.code === 'P2002') {
          throw new ConflictError('Already exits a register with these data');
        }
      }
      throw error;
    }
  };
}
