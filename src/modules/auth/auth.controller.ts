import type { Request, Response } from 'express';
import { loginSchema, registerSchema } from './auth.dto.js';
import type AuthService from './auth.service.js';

export default class AuthController {
  constructor(private authService: AuthService) {}

  public register = async (req: Request, res: Response) => {
    try {
      const validatedData = registerSchema.parse(req.body); // Se não validar, lança ZodError
      const userRegistered = await this.authService.register(validatedData);
      res.status(201).json({ message: 'User registered successfully!', userRegistered });
    } catch (error) {
      console.log(error);
      throw error;
    }
  };

  public login = async (req: Request, res: Response) => {
    try {
      const validatedData = loginSchema.parse(req.body);
      const token = await this.authService.login(validatedData);
      res.status(200).json({ message: 'User logged successfully!', token });
    } catch (error) {
      console.log(error);
      throw error;
    }
  };
}
