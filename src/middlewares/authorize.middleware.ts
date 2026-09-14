import type { NextFunction, Request, Response } from 'express';
import ForbiddenError from '../errors/forbidden.error.js';
import UnauthorizedError from '../errors/unauthorized.error.js';

export default function authorize(req: Request, _res: Response, next: NextFunction) {
  if (!req.user) throw new UnauthorizedError();
  const userRole = req.user.role;
  if (userRole !== 'ADMIN') {
    throw new ForbiddenError("You dont't have permission to perform this operation");
  }
  return next();
}
