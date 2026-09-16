import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import BaseError from '../errors/base.error.js';

export default function errorHandler(
  error: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
) {
  console.log(error);
  if (error instanceof BaseError) {
    return error.sendAnswer(res);
  }

  if (error instanceof ZodError) {
    return res.status(400).json({
      statusCode: 400,
      message: 'Valdation Error',
      errors: error.issues,
    });
  }

  return new BaseError().sendAnswer(res);
}
