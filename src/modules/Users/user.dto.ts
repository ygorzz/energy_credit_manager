import z from 'zod';

const userFieldsSchema = z.object({
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
  role: z.enum(['ADMIN', 'ANALYST', 'CLIENT']),
  status: z.enum(['ACTIVE', 'INACTIVE', 'CANCELED']),
  companyId: z.uuid('Invalid company ID').nullable(),
});

export const registerUserSchema = userFieldsSchema
  .extend({
    role: userFieldsSchema.shape.role.default('CLIENT'),
    status: userFieldsSchema.shape.status.default('ACTIVE'),
  })
  .refine((data) => data.role !== 'CLIENT' || data.companyId !== null, {
    path: ['companyId'],
    message: 'A client user must be linked to a company',
  });

// PATCH must not reapply registration defaults and silently change role or status.
// Reject PATCH bodies without any recognized field after parsing.
export const updateUserSchema = userFieldsSchema
  .partial()
  .refine((data) => Object.values(data).some((value) => value !== undefined), {
    message: 'At least one field must be provided for update',
  });

export const listUsersSchema = z.object({
  page: z.coerce.number().int().positive().min(1).default(1),
  limit: z.coerce.number().int().positive().min(1).max(10).default(10),
});

export type listUsersDTO = z.infer<typeof listUsersSchema>;
export type RegisterUserDTO = z.infer<typeof registerUserSchema>;
export type UpdateUserDTO = z.infer<typeof updateUserSchema>;
