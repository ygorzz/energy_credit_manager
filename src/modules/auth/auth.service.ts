import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env.js';
import { Prisma } from '../../db/generated/prisma/client.js';
import ConflictError from '../../errors/conflict.error.js';
import ForbiddenError from '../../errors/forbidden.error.js';
import UnauthorizedError from '../../errors/unauthorized.error.js';
import type { RegisterUserDTO } from '../Users/user.dto.js';
import type UserRepository from '../Users/user.repository.js';
import type { LoginDTO } from './auth.dto.js';

export default class AuthService {
  constructor(private userRepository: UserRepository) {}
  public registerUser = async (data: RegisterUserDTO) => {
    try {
      const hashPassword = await bcrypt.hash(data.password, 10);
      const { password, ...rest } = data;
      const newData = { password: hashPassword, ...rest };
      return await this.userRepository.create(newData);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ConflictError('Already exists a user with this email');
        }
      }
      throw error;
    }
  };

  public login = async (data: LoginDTO) => {
    const userFound = await this.userRepository.findByEmail(data.email);
    if (!userFound) throw new UnauthorizedError('Invalid email or password');

    const passwordIsValid = await bcrypt.compare(data.password, userFound.hashPassword);
    if (!passwordIsValid) throw new UnauthorizedError('Invalid email or password');

    if (userFound.status !== 'ACTIVE')
      throw new ForbiddenError('Your account is inactive. Please contact the administrator.');

    // send userId and userRole as token payload
    const token = jwt.sign({ id: userFound.id, role: userFound.role }, env.JWT_SECRET, {
      expiresIn: '1h',
    });

    return token;
  };
}
