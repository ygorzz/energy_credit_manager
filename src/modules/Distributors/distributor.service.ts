import { Prisma } from '../../db/generated/prisma/client.js';
import isTransactionConflict from '../../db/is-transaction-conflict.js';
import ConflictError from '../../errors/conflict.error.js';
import NotFoundError from '../../errors/not-found.error.js';
import type { CreateDistributorDTO, UpdateDistributorDTO } from './distributor.dto.js';
import type DistributorRepository from './distributor.repository.js';

export default class DistributorService {
  constructor(private distributorRepository: DistributorRepository) {}
  public createDistributor = async (data: CreateDistributorDTO) => {
    try {
      return await this.distributorRepository.create(data);
    } catch (error) {
      if (isTransactionConflict(error)) {
        throw new ConflictError('The distributor changed concurrently. Please retry.');
      }
      // Distributor names must remain unique, including concurrent creations.
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ConflictError('Already exists a distributor with this name');
        }
      }
      throw error;
    }
  };

  public listDistributors = async (page: number, limit: number) => {
    const skip = (page - 1) * limit;
    return await this.distributorRepository.findAll(skip, limit);
  };

  public getDistributorById = async (id: string) => {
    const distributorFound = await this.distributorRepository.findById(id);

    if (!distributorFound) throw new NotFoundError('Distributor not found');

    return distributorFound;
  };

  public deleteDistributor = async (id: string) => {
    try {
      return await this.distributorRepository.delete(id);
    } catch (error) {
      if (isTransactionConflict(error)) {
        throw new ConflictError('The distributor changed concurrently. Please retry.');
      }
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new NotFoundError('Distributor not found');
        }
        // Related plants, companies or monthly balances prevent distributor deletion.
        if (error.code === 'P2003') {
          throw new ConflictError(
            'Cannot delete a distributor with linked power plants, client companies or monthly balances',
          );
        }
      }
      throw error;
    }
  };

  public updateDistributor = async (id: string, data: UpdateDistributorDTO) => {
    try {
      const newData = data.name === undefined ? {} : { name: data.name };
      return await this.distributorRepository.update(id, newData);
    } catch (error) {
      if (isTransactionConflict(error)) {
        throw new ConflictError('The distributor changed concurrently. Please retry.');
      }
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new NotFoundError('Distributor not found');
        }
        // Renaming follows the same uniqueness rule as creation.
        if (error.code === 'P2002') {
          throw new ConflictError('Already exists a distributor with this name');
        }
      }
      throw error;
    }
  };
}
