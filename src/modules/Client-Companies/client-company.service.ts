import { Prisma } from '../../db/generated/prisma/client.js';
import isTransactionConflict from '../../db/is-transaction-conflict.js';
import { db } from '../../db/prisma.js';
import BadRequestError from '../../errors/bad-request.error.js';
import ConflictError from '../../errors/conflict.error.js';
import NotFoundError from '../../errors/not-found.error.js';
import type { createClientCompanyDTO, updateClientCompanyDTO } from './client-company.dto.js';
import type ClientCompanyRepository from './client-company.repository.js';

export default class ClientCompanyService {
  constructor(private clientCompanyRepository: ClientCompanyRepository) {}
  public createClientCompany = async (data: createClientCompanyDTO) => {
    try {
      cnpjValidation(data.cnpj);

      return await this.clientCompanyRepository.create(data);
    } catch (error) {
      this.rethrowWriteError(error, 'create');
    }
  };

  public listClientCompanies = async (page: number, limit: number) => {
    const skip = (page - 1) * limit;
    return await this.clientCompanyRepository.findAll(skip, limit);
  };

  public getClientCompanyById = async (id: string) => {
    const company = await this.clientCompanyRepository.findById(id);

    if (!company) throw new NotFoundError('Client company not found');

    return company;
  };

  public deleteClientCompany = async (id: string) => {
    try {
      return await db.$transaction(
        async (tx) => {
          // Do not delete a company if that would leave CLIENT users without a company.
          if (await this.clientCompanyRepository.hasClientUsers(id, tx)) {
            throw new ConflictError('Cannot delete a company with linked client users');
          }
          return await this.clientCompanyRepository.delete(id, tx);
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error) {
      this.rethrowWriteError(error, 'delete');
    }
  };

  public updateClientCompany = async (id: string, data: updateClientCompanyDTO) => {
    try {
      if (data.cnpj !== undefined) cnpjValidation(data.cnpj);

      const newData = Object.fromEntries(
        Object.entries(data).filter((entry) => entry[1] !== undefined),
      );
      return await db.$transaction(
        async (tx) => {
          const company = await this.clientCompanyRepository.findById(id, tx);
          if (!company) throw new NotFoundError('Client company not found');
          // Existing allocations prevent changing the distributor of historical balances.
          if (
            data.distributorId !== undefined &&
            data.distributorId !== company.distributorId &&
            (await this.clientCompanyRepository.hasCreditAllocations(id, tx))
          ) {
            throw new ConflictError(
              'Cannot change distributor of a company with allocation history',
            );
          }
          return await this.clientCompanyRepository.update(id, newData, tx);
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error) {
      this.rethrowWriteError(error, 'update');
    }
  };

  // Keep company reference failures separate from dependencies that prevent deletion.
  private rethrowWriteError(error: unknown, operation: 'create' | 'update' | 'delete'): never {
    if (isTransactionConflict(error)) {
      throw new ConflictError('The energy data changed concurrently. Please retry.');
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025' && operation !== 'create') {
        throw new NotFoundError('Client company not found');
      }
      if (error.code === 'P2002' && operation !== 'delete') {
        throw new ConflictError('Already exists a client company with this CNPJ');
      }
      if (error.code === 'P2003') {
        // Allocation history prevents deleting the company that owns it.
        if (operation === 'delete') {
          throw new ConflictError('Cannot delete a client company with allocation history');
        }
        throw new NotFoundError(
          operation === 'create'
            ? 'Distributor not found in the database'
            : 'Distributor id not found in the database',
        );
      }
    }
    throw error;
  }
}

function cnpjValidation(cnpj: string): void {
  if (cnpj.length !== 14 || !/^\d{14}$/.test(cnpj) || /^(\d)\1{13}$/.test(cnpj)) {
    throw new BadRequestError('Invalid CNPJ');
  }

  // Executes the algorithm two times -> two check digits
  for (let digitIndex = 12; digitIndex < 14; digitIndex++) {
    let sum = 0;
    let weight = digitIndex - 7; // each check digit starts with a weight (5 and 6)

    // algorithm core
    for (const digit of cnpj.slice(0, digitIndex)) {
      sum += Number(digit) * weight;
      weight = weight === 2 ? 9 : weight - 1; // update weight
    }

    // defines the check digit
    const remainder = sum % 11;
    const expectedDigit = remainder < 2 ? 0 : 11 - remainder;
    if (Number(cnpj.charAt(digitIndex)) !== expectedDigit) {
      throw new BadRequestError('Invalid CNPJ');
    }
  }
}
