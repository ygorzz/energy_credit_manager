import { Prisma } from "../../db/generated/prisma/client.js";
import { db } from "../../db/prisma.js";
import ConflictError from "../../errors/conflict.error.js";
import NotFoundError from "../../errors/not-found.error.js";
import type { updateUserDTO } from "./user.dto.js";

export default class UserService {
  public findAll = async (page: number, limit: number) => {
    const skip = (page - 1) * limit;
    const users = await db.user.findMany({
      skip,
      take: limit,
    });
    return users;
  };

  public findById = async (id: string) => {
    const userFound = await db.user.findUnique({
      where: {
        id,
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
      const newData = Object.fromEntries(
        Object.entries(data).filter((e) => e[1] !== undefined),
      );
      const userUpdated = await db.user.update({
        where: {
          id,
        },
        data: newData,
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
