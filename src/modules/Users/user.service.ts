import bcrypt from 'bcrypt';
import { Prisma } from '../../db/generated/prisma/client.js';
import NotFoundError from '../../errors/not-found.error.js';
import type { UpdateUserDTO } from './user.dto.js';
import type UserRepository from './user.repository.js';

export default class UserService {
  constructor(private userRepository: UserRepository) {}
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
      return await this.userRepository.update(id, newData);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new NotFoundError('User not found');
        }
      }
      throw error;
    }
  };
}
