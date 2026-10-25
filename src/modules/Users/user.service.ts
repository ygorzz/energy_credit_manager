import bcrypt from 'bcrypt';
import { Prisma } from '../../db/generated/prisma/client.js';
import isTransactionConflict from '../../db/is-transaction-conflict.js';
import { db } from '../../db/prisma.js';
import ConflictError from '../../errors/conflict.error.js';
import NotFoundError from '../../errors/not-found.error.js';
import type ClientCompanyRepository from '../Client-Companies/client-company.repository.js';
import type { UpdateUserDTO } from './user.dto.js';
import type UserRepository from './user.repository.js';
import validateUserCompany from './user-company.validation.js';

export default class UserService {
  constructor(
    private userRepository: UserRepository,
    private clientCompanyRepository: ClientCompanyRepository,
  ) {}
  public listUsers = async (page: number, limit: number) => {
    const skip = (page - 1) * limit;
    return await this.userRepository.findAll(skip, limit);
  };

  public getUserById = async (id: string) => {
    const userFound = await this.userRepository.findById(id);

    if (!userFound) throw new NotFoundError('User not found');

    return userFound;
  };

  public deleteUser = async (id: string) => {
    try {
      return await this.userRepository.delete(id);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new NotFoundError('User not found');
        }
      }
      throw error;
    }
  };

  public updateUser = async (id: string, data: UpdateUserDTO) => {
    try {
      let newData = Object.fromEntries(Object.entries(data).filter((e) => e[1] !== undefined));

      if (newData.password) {
        const hashPassword = await bcrypt.hash(newData.password, 10);
        const { password, ...rest } = newData;
        newData = {
          hashPassword,
          ...rest,
        };
      }
      return await db.$transaction(
        async (tx) => {
          const user = await this.userRepository.findById(id, tx);
          if (!user) throw new NotFoundError('User not found');
          // Validate the effective PATCH role and company link while preserving omitted fields.
          await validateUserCompany(
            data.role ?? user.role,
            data.companyId === undefined ? user.companyId : data.companyId,
            this.clientCompanyRepository,
            tx,
          );
          return await this.userRepository.update(id, newData, tx);
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error) {
      if (isTransactionConflict(error)) {
        throw new ConflictError('The user or company changed concurrently. Please retry.');
      }
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new NotFoundError('User not found');
        }
      }
      throw error;
    }
  };
}
