import type { NextFunction, Request, Response } from 'express';
import { uuidSchema } from '../../shared/schemas/uuid.dto.js';
import type { IdParams } from '../../types.js';
import { listUsersSchema, updateUserSchema } from './user.dto.js';
import type UserService from './user.service.js';

export default class UsersController {
  constructor(private userService: UserService) {}

  public listUsers = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { page, limit } = listUsersSchema.parse(req.query);
      const users = await this.userService.listUsers(page, limit);
      return res.status(200).json(users);
    } catch (error) {
      next(error);
    }
  };

  public getUserById = async (req: Request<IdParams>, res: Response, next: NextFunction) => {
    try {
      const validatedParams = uuidSchema.parse(req.params);
      const { id } = validatedParams;
      const user = await this.userService.getUserById(id);
      return res.status(200).json(user);
    } catch (error) {
      next(error);
    }
  };

  // Preserve response keys while using concise local result names.
  // types the Request with the IdParams type for id: string
  public deleteUser = async (req: Request<IdParams>, res: Response, next: NextFunction) => {
    try {
      const validatedParams = uuidSchema.parse(req.params);
      const { id } = validatedParams;
      const deleted = await this.userService.deleteUser(id);
      return res.status(200).json({
        message: 'User deleted successfully!',
        deleted,
      });
    } catch (error) {
      next(error);
    }
  };

  public updateUser = async (req: Request<IdParams>, res: Response, next: NextFunction) => {
    try {
      const validatedParams = uuidSchema.parse(req.params);
      const { id } = validatedParams;
      const validatedData = updateUserSchema.parse(req.body);
      const updated = await this.userService.updateUser(id, validatedData);
      return res.status(200).json({
        message: 'User updated successfully!',
        updated,
      });
    } catch (error) {
      next(error);
    }
  };
}
