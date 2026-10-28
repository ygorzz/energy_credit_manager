import z from 'zod';

export const createDistributorSchema = z.object({
  name: z
    .string('Invalid distributor.')
    .trim()
    .toUpperCase()
    .min(2, 'Name must contain at least 2 characters')
    .max(50, 'Name must contain a maximum of 50 characters'),
});

// Reject PATCH bodies without any recognized field after parsing.
export const updateDistributorSchema = createDistributorSchema
  .extend({
    name: createDistributorSchema.shape.name.optional(),
  })
  .refine((data) => Object.values(data).some((value) => value !== undefined), {
    message: 'At least one field must be provided for update',
  });

// Adds pagination
export const listDistributorsSchema = z.object({
  // .coerce casts the value from string to number
  page: z.coerce.number().int().positive().min(1).default(1),
  limit: z.coerce.number().int().positive().min(1).max(10).default(10),
});

export type CreateDistributorDTO = z.infer<typeof createDistributorSchema>;
export type UpdateDistributorDTO = z.infer<typeof updateDistributorSchema>;
export type ListDistributorDTO = z.infer<typeof listDistributorsSchema>;
