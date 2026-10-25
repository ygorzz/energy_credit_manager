import type { UserRoles } from './db/generated/prisma/enums.js';

// Extends the Express's Request type for to suport the user attribute with the id attribute
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        role: UserRoles;
      };
    }
  }
}

export interface IdParams {
  id: string;
}
