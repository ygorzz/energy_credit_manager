import z from 'zod';

export const createClientCompanySchema = z.object({
  name: z
    .string('Invalid client company name')
    .trim()
    .toUpperCase()
    .min(1, 'Name must contain at least 1 characters')
    .max(100, 'Name must contain a maximum of 100 characters'),
  // Accepts CNPJ with or without the mask
  cnpj: z
    .string()
    .regex(/^(?:\d{14}|\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2})$/, 'Invalid CNPJ format')
    // Normalizes CNPJ and remove mask
    .transform((value) => value.replace(/\D/g, ''))
    .refine((value) => value.length === 14, 'CNPJ must have 14 digits'),
  // The default percentage is an integer from 0 to 100, matching the database field.
  allocationPercentage: z
    .number('Percentage must be a number')
    .int('Percentage must be an integer')
    .min(0, 'Percentage must be at least zero')
    .max(100, 'Percentage must be at most 100'),
  distributorId: z.uuid(),
});

export const updateClientCompanySchema = createClientCompanySchema.extend({
  name: createClientCompanySchema.shape.name.optional(),
  cnpj: createClientCompanySchema.shape.cnpj.optional(),
  allocationPercentage: createClientCompanySchema.shape.allocationPercentage.optional(),
  distributorId: createClientCompanySchema.shape.distributorId.optional(),
});

export const listClientCompaniesSchema = z.object({
  page: z.coerce.number().int().positive().min(1).default(1),
  limit: z.coerce.number().int().positive().min(1).max(10).default(10),
});

export type createClientCompanyDTO = z.infer<typeof createClientCompanySchema>;
export type updateClientCompanyDTO = z.infer<typeof updateClientCompanySchema>;
