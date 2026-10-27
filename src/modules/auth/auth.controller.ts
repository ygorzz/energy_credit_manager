import type { NextFunction, Request, Response } from 'express';
import { registerUserSchema } from '../Users/user.dto.js';
import { loginSchema } from './auth.dto.js';
import type AuthService from './auth.service.js';

export default class AuthController {
  constructor(private authService: AuthService) {}

  // Preserve response keys while using concise local result names.
  public registerUser = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validatedData = registerUserSchema.parse(req.body); // If no validate, throws ZodError
      const created = await this.authService.registerUser(validatedData);
      res.status(201).json({ message: 'User registered successfully!', created });
    } catch (error) {
      next(error);
    }
  };

  public login = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validatedData = loginSchema.parse(req.body);
      const token = await this.authService.login(validatedData);
      res.status(200).json({ message: 'User logged successfully!', token });
    } catch (error) {
      next(error);
    }
  };
}
