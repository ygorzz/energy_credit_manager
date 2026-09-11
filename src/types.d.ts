import type { JwtPayload } from 'jsonwebtoken';

// Extends the Express's Request type for to suport the user attribute with the id attribute
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string | JwtPayload;
        role: "ADMIN" | "CLIENT" | "ANALYST"
      };
    }
  }
}
