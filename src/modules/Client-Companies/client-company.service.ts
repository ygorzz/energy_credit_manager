import { Prisma } from '../../db/generated/prisma/client.js';
import { db } from '../../db/prisma.js';
import ConflictError from '../../errors/conflict.error.js';
import NotFoundError from '../../errors/not-found.error.js';
import type { createClientCompanyDTO, updateClientCompanyDTO } from './client-company.dto.js';
import type ClientCompanyRepository from './client-company.repository.js';

export default class ClientCompanyService {
  constructor(private clientCompanyRepository: ClientCompanyRepository) {}
  public createClientCompany = async (data: createClientCompanyDTO) => {
    try {
      // CNPJ VALIDATION -> math calculation

      return await this.clientCompanyRepository.create(data);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ConflictError('Already exists a client company with this CNPJ');
        }
        if (error.code === 'P2003') {
          throw new NotFoundError('Distributor not found in the database');
        }
      }
    }
  };

  public listClientCompanies = async (page: number, limit: number) => {
    const skip = (page - 1) * limit;
    return await this.clientCompanyRepository.findAll(skip, limit);
  };

  public getClientCompanyById = async (id: string) => {
    const clientCompanyFound = await this.clientCompanyRepository.findById(id);

    if (!clientCompanyFound) throw new NotFoundError('Client company not found');

    return clientCompanyFound;
  };

  public deleteClientCompany = async (id: string) => {
    try {
      return await this.clientCompanyRepository.delete(id);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new NotFoundError('Client company not found');
        }
      }
      throw error;
    }
  };

  public updateClientCompany = async (id: string, data: updateClientCompanyDTO) => {
    try {
      const newData = Object.fromEntries(Object.entries(data).filter((e) => e[1] !== undefined));
      return await this.clientCompanyRepository.update(id, newData);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new NotFoundError('Client company not found');
        }
        if (error.code === 'P2003') {
          throw new NotFoundError('Distributor id not found in the database');
        }
        if (error.code === 'P2002') {
          throw new ConflictError('Already exists a client company with this CNPJ');
        }
      }
      throw error;
    }
  };
}

function cnpjValidation(cnpj: string) {}
