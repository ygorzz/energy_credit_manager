import z from 'zod';
import { UserRoles } from '../../db/generated/prisma/enums.js';

export const authTokenPayloadSchema = z.object({
  id: z.uuid(),
  role: z.enum(UserRoles),
});

export type AuthTokenPayloadDTO = z.infer<typeof authTokenPayloadSchema>;
