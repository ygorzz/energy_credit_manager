import type { NextFunction, Request, Response } from 'express';
import type { UserRoles } from '../db/generated/prisma/enums.js';
import ForbiddenError from '../errors/forbidden.error.js';
import UnauthorizedError from '../errors/unauthorized.error.js';

export default function authorize(...allowedRoles: UserRoles[]) {
  return <P>(req: Request<P>, _res: Response, next: NextFunction) => {
    if (!req.user) throw new UnauthorizedError();
    const userRole = req.user.role;
    if (!allowedRoles.includes(userRole)) {
      throw new ForbiddenError("You dont't have permission to perform this operation");
    }
    return next();
  };
}
