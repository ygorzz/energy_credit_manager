import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import ForbiddenError from '../errors/forbidden.error.js';
import UnauthorizedError from '../errors/unauthorized.error.js';
import UserRepository from '../modules/Users/user.repository.js';
import {
  type AuthTokenPayloadDTO,
  authTokenPayloadSchema,
} from '../shared/schemas/auth-token.dto.js';

const userRepository = new UserRepository();

// <P> -> adapts to the parameters coming from the route
export default async function auth<P>(req: Request<P>, res: Response, next: NextFunction) {
  let decoded: AuthTokenPayloadDTO;

  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) throw new UnauthorizedError('No token provided');

    // Accept only Bearer followed by a single token.
    const token = /^Bearer +(\S+)$/i.exec(authHeader)?.[1];
    if (!token) throw new UnauthorizedError('Malformed token');

    // return the decoded payload -> payload contains the users infos
    // the payload contain the userId sended on the login service
    // Validate the signature, expiration and claim types before looking up the user.
    const payload = authTokenPayloadSchema.safeParse(jwt.verify(token, env.JWT_SECRET));
    if (!payload.success) throw new UnauthorizedError('Invalid token payload');
    decoded = payload.data;
  } catch (error) {
    // Preserve known authentication errors; use a generic response for JWT failures.
    const authError =
      error instanceof UnauthorizedError
        ? error
        : new UnauthorizedError('Invalid or expired token');
    authError.sendAnswer(res);
    return;
  }

  try {
    // check if the user still exists and is active
    const user = await userRepository.findById(decoded.id);
    if (!user) throw new UnauthorizedError('User no longer exists');
    if (user.status !== 'ACTIVE') {
      throw new ForbiddenError('Your account is inactive. Please contact the administrator.');
    }

    // Authorize with the current database role, even when the token contains an older role.
    req.user = {
      id: user.id,
      role: user.role,
    };

    next();
  } catch (error) {
    next(error);
  }
}
  