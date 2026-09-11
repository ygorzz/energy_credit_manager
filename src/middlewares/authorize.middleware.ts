import type { NextFunction, Request, Response } from 'express';

export default function authorize(req: Request, res: Response, next: NextFunction) {
  if (!req.user) throw new Error('Unauthorized - 401');
  const userRole = req.user.role;
  if (userRole !== 'ADMIN') {
    return res
      .status(403)
      .json({ message: 'Unauthorized role. You can not access this funcionality' });
  }
  return next();
}
