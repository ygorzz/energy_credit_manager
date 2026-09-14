import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import BadRequestError from '../errors/BadRequestError.js';
import BaseError from '../errors/BaseError.js';

export default function errorHandler(
  error: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
) {
  if (error instanceof BaseError) {
    return error.sendAnswer(res);
  }

  if (error instanceof ZodError) {
    return new BadRequestError(error).sendAnswer(res);
  }

  return new BaseError().sendAnswer(res);
}
