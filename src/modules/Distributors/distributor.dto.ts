import z from 'zod';

export const createDistributorSchema = z.object({
  name: z
    .string('Invalid distributor.')
    .min(2, 'Name must contain at least 2 charaters')
    .max(50, 'Name must contain a maximum of 50 characters'),
});

export const updateDistributorSchema = z.object({
  name: z
    .string('Invalid distributor.')
    .min(2, 'Name must contain at least 2 charaters')
    .max(50, 'Name must contain a maximum of 50 characters')
    .optional()
});

export type CreateDistributorDTO = z.infer<typeof createDistributorSchema>;
export type UpdateDistributorDTO = z.infer<typeof updateDistributorSchema>;
