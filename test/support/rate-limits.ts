import type { RateLimitRequestHandler } from 'express-rate-limit';
import { ipKeyGenerator } from 'express-rate-limit';
import * as limiters from '../../src/middlewares/rate-limit.middleware.js';

export const clientKey = ipKeyGenerator('127.0.0.1');

export async function resetRateLimits() {
  // Exercise real middleware while keeping independent cases out of each other's quota.
  for (const limiter of Object.values(limiters)) {
    await (limiter as RateLimitRequestHandler).resetKey(clientKey);
  }
}
