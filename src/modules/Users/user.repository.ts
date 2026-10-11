import { db } from '../../db/prisma.js';
import type { RegisterUserDTO, UpdateUserDTO } from './user.dto.js';

export default class UserRepository {
  public create = async (data: RegisterUserDTO) => {
    const { password, ...rest } = data;
    return await db.user.create({
      data: {
        ...rest,
        hashPassword: password,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        companyId: true,
      },
    });
  };

  public findAll = async (skip: number, take: number) => {
    return await db.user.findMany({
      skip,
      take,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        companyId: true,
      },
    });
  };

  public findById = async (id: string) => {
    return await db.user.findUnique({
      where: {
        id,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        companyId: true,
      },
    });
  };

  public findByEmail = async (email: string) => {
    return await db.user.findUnique({
      where: {
        email,
      },
    });
  };

  public delete = async (id: string) => {
    return await db.user.delete({
      where: {
        id,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        companyId: true,
      },
    });
  };

  public update = async (id: string, data: UpdateUserDTO) => {
    return await db.user.update({
      where: {
        id,
      },
      data: {
        data,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        companyId: true,
      },
    });
  };
}
