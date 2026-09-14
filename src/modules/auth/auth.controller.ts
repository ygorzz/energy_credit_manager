import type { NextFunction, Request, Response } from 'express';
import { loginSchema, registerSchema } from './auth.dto.js';
import type AuthService from './auth.service.js';

export default class AuthController {
  constructor(private authService: AuthService) {}

  public register = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validatedData = registerSchema.parse(req.body); // If no validate, throws ZodError
      const userRegistered = await this.authService.register(validatedData);
      res.status(201).json({ message: 'User registered successfully!', userRegistered });
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
