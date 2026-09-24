import { rateLimit } from "express-rate-limit";
import type { NextFunction, Request, Response } from "express";

const WINDOW_IN_MINUTE: number = 1;
const LIMIT_MESSAGE: string = `Too many requests from this IP. Try again after ${WINDOW_IN_MINUTE} minute`;

type RouteRateLimiter = <P>(
  req: Request<P>,
  res: Response,
  next: NextFunction,
) => void;

function createLimiter(max: number): RouteRateLimiter {
  return rateLimit({
    windowMs: WINDOW_IN_MINUTE * 60 * 1000,
    max,
    message: LIMIT_MESSAGE,
  }) as RouteRateLimiter;
}

export const loginLimiter = createLimiter(10);
export const creationLimiter = createLimiter(20);
export const getLimiter = createLimiter(60);
export const deleteLimiter = createLimiter(10);
export const updateLimiter = createLimiter(20);
