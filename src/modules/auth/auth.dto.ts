import { z } from 'zod';

export const registerSchema = z.object({
  name: z
    .string()
    .min(4, 'Name must contain at least 4 charaters')
    .max(50, 'Name must contain a maximum of 50 characters'),
  email: z.email('Invalid email'),
  password: z
    .string()
    .min(4, 'Password must contain at least 4 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter.')
    .regex(/[0-9]/, 'Password must contain at least one number.'),
  role: z.enum(['ADMIN', 'ANALYST', 'CLIENT']).default('CLIENT'),
  status: z.enum(['ACTIVE', 'INACTIVE', 'CANCELED']).default('ACTIVE'),
  companyId: z.string().nullish(),
});

export const loginSchema = z.object({
  email: z.email('Invalid email'),
  password: z
    .string()
    .min(4, 'Password must contain at least 4 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter.')
    .regex(/[0-9]/, 'Password must contain at least one number.'),
});

export type RegisterDto = z.infer<typeof registerSchema>;
export type LoginDTO = z.infer<typeof loginSchema>;
