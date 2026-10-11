import z from 'zod';

export const registerUserSchema = z.object({
  name: z
    .string()
    .min(4, 'Name must contain at least 4 charaters')
    .max(50, 'Name must contain a maximum of 50 characters'),
  email: z.email('Invalid email').trim().toUpperCase(),
  password: z
    .string()
    .min(4, 'Password must contain at least 4 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter.')
    .regex(/[0-9]/, 'Password must contain at least one number.'),
  role: z.enum(['ADMIN', 'ANALYST', 'CLIENT']).default('CLIENT'),
  status: z.enum(['ACTIVE', 'INACTIVE', 'CANCELED']).default('ACTIVE'),
  companyId: z.string().nullable(),
});

export const updateUserSchema = registerUserSchema.extend({
  name: registerUserSchema.shape.name.optional(),
  email: registerUserSchema.shape.email.optional(),
  password: registerUserSchema.shape.password.optional(),
  role: registerUserSchema.shape.role.optional(),
  status: registerUserSchema.shape.status.optional(),
  companyId: registerUserSchema.shape.companyId.optional(),
});

export const listUsersSchema = z.object({
  page: z.coerce.number().int().positive().min(1).default(1),
  limit: z.coerce.number().int().positive().min(1).max(10).default(10),
});

export type listUsersDTO = z.infer<typeof listUsersSchema>;
export type RegisterUserDTO = z.infer<typeof registerUserSchema>;
export type UpdateUserDTO = z.infer<typeof updateUserSchema>;
