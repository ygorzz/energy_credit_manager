import type { NextFunction, Request, Response } from "express";
import type UserService from "./user.service.js";
import { listUsersSchema, updateUserSchema } from "./user.dto.js";
import type { IdParams } from "../../types.js";
import { uuidSchema } from "../../shared/schemas/uuid.dto.js";

export default class UsersController {
  constructor(private userService: UserService) {}

  public listUsers = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const { page, limit } = listUsersSchema.parse(req.query);
      const users = await this.userService.findAll(page, limit);
      return res.status(200).json(users);
    } catch (error) {
      next(error);
    }
  };

  public getUserById = async (
    req: Request<IdParams>,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const idValidated = uuidSchema.parse(req.params);
      const { id } = idValidated;
      const userFound = await this.userService.findById(id);
      return res.status(200).json(userFound);
    } catch (error) {
      next(error);
    }
  };

  // types the Request with the IdParams type for id: string
  public deleteUser = async (
    req: Request<IdParams>,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const idValidated = uuidSchema.parse(req.params);
      const { id } = idValidated;
      const userDeleted = await this.userService.delete(id);
      return res.status(200).json({
        message: "User deleted successfully!",
        userDeleted,
      });
    } catch (error) {
      next(error);
    }
  };

  public updateUser = async (
    req: Request<IdParams>,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const idValidated = uuidSchema.parse(req.params);
      const { id } = idValidated;
      const validatedData = updateUserSchema.parse(req.body);
      const userUpdated = await this.userService.update(id, validatedData);
      return res.status(200).json({
        message: "User updated successfully!",
        userUpdated,
      });
    } catch (error) {
      next(error);
    }
  };
}
