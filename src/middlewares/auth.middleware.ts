import type { NextFunction, Request, Response } from 'express';
import jwt, { type JwtPayload } from 'jsonwebtoken';
import { env } from '../config/env.js';

export default function auth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ message: 'No token provided' });

  const token = authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Malformed token' });

  // return the decoded payload -> payload contains the users infos
  // the payload contain the userId sended on the login service
  const decoded = jwt.verify(token, env.JWT_SECRET) as NewJwtPayload;
  req.user = {
    id: decoded.id,
    role: decoded.role,
  };

  next();
}

// Create a new type because jwt.verify doesn't know that I added id and role on the payload. So, it's throw an error without a new type like tihs:
interface NewJwtPayload extends JwtPayload {
  id: string;
  role: 'ADMIN' | 'CLIENT' | 'ANALYST';
}
