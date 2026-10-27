import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env.js';
import { Prisma } from '../../db/generated/prisma/client.js';
import isTransactionConflict from '../../db/is-transaction-conflict.js';
import { db } from '../../db/prisma.js';
import ConflictError from '../../errors/conflict.error.js';
import ForbiddenError from '../../errors/forbidden.error.js';
import NotFoundError from '../../errors/not-found.error.js';
import UnauthorizedError from '../../errors/unauthorized.error.js';
import type ClientCompanyRepository from '../Client-Companies/client-company.repository.js';
import type { RegisterUserDTO } from '../Users/user.dto.js';
import type UserRepository from '../Users/user.repository.js';
import validateUserCompany from '../Users/user-company.validation.js';
import type { LoginDTO } from './auth.dto.js';

export default class AuthService {
  constructor(
    private userRepository: UserRepository,
    private clientCompanyRepository: ClientCompanyRepository,
  ) {}
  public registerUser = async (data: RegisterUserDTO) => {
    try {
      const hashPassword = await bcrypt.hash(data.password, 10);
      const { password, ...rest } = data;
      const newData = { hashPassword, ...rest };
      return await db.$transaction(
        async (tx) => {
          // Validate the company link and create the user in one transaction to protect against deletions.
          await validateUserCompany(data.role, data.companyId, this.clientCompanyRepository, tx);
          return await this.userRepository.create(newData, tx);
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error) {
      this.rethrowWriteError(error);
    }
  };

  public login = async (data: LoginDTO) => {
    const user = await this.userRepository.findByEmail(data.email);
    if (!user) throw new UnauthorizedError('Invalid email or password');

    const passwordIsValid = await bcrypt.compare(data.password, user.hashPassword);
    if (!passwordIsValid) throw new UnauthorizedError('Invalid email or password');

    if (user.status !== 'ACTIVE')
      throw new ForbiddenError('Your account is inactive. Please contact the administrator.');

    // send userId and userRole as token payload
    const token = jwt.sign({ id: user.id, role: user.role }, env.JWT_SECRET, {
      expiresIn: '1h',
    });

    return token;
  };

  // Translate registration failures while preserving business and unexpected errors.
  private rethrowWriteError(error: unknown): never {
    if (isTransactionConflict(error)) {
      throw new ConflictError('The user or company changed concurrently. Please retry.');
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        throw new ConflictError('Already exists a user with this email');
      }
      // The company must still exist when the user is persisted.
      if (error.code === 'P2003') {
        throw new NotFoundError('Client company not found');
      }
    }
    throw error;
  }
}
