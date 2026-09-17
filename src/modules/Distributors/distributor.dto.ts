import z from "zod";

export const createDistributorSchema = z.object({
  name: z
    .string("Invalid distributor.")
    .trim()
    .toUpperCase()
    .min(2, "Name must contain at least 2 characters")
    .max(50, "Name must contain a maximum of 50 characters"),
});

export const updateDistributorSchema = z.object({
  name: z
    .string("Invalid distributor.")
    .min(2, "Name must contain at least 2 characters")
    .max(50, "Name must contain a maximum of 50 characters")
    .optional(),
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
