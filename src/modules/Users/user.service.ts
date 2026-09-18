import { Prisma } from "../../db/generated/prisma/client.js";
import { db } from "../../db/prisma.js";
import ConflictError from "../../errors/conflict.error.js";
import NotFoundError from "../../errors/not-found.error.js";
import type { updateUserDTO } from "./user.dto.js";
import bcrypt from "bcrypt";

export default class UserService {
  public findAll = async (page: number, limit: number) => {
    const skip = (page - 1) * limit;
    const users = await db.user.findMany({
      skip,
      take: limit,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        companyId: true,
      },
    });
    return users;
  };

  public findById = async (id: string) => {
    const userFound = await db.user.findUnique({
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

    if (!userFound) throw new NotFoundError("User not found");

    return userFound;
  };

  public delete = async (id: string) => {
    try {
      const userDeleted = await db.user.delete({
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

      return userDeleted;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2025") {
          throw new NotFoundError("User not found");
        }
      }
      throw error;
    }
  };

  public update = async (id: string, data: updateUserDTO) => {
    try {
      let newData = Object.fromEntries(
        Object.entries(data).filter((e) => e[1] !== undefined),
      );

      if (newData.password) {
        const hashPassword = await bcrypt.hash(newData.password, 10);
        const { password, ...rest } = newData;
        newData = {
          hashPassword,
          ...rest,
        };
      }
      const userUpdated = await db.user.update({
        where: {
          id,
        },
        data: newData,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          status: true,
          companyId: true,
        },
      });

      return userUpdated;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2025") {
          throw new NotFoundError("User not found");
        }
      }
      throw error;
    }
  };
}
