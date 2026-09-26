import z from "zod";
import { Months } from "../../db/generated/prisma/enums.js";

export const createMonthlyGenerationSchema = z.object({
  month: z.enum(Months, {
    error: "Invalid month",
  }),
  year: z.number().int().min(2000).max(2100),
  energyGeneratedMwh: z
    .number("Energy generated must be a number")
    .nonnegative("Energy generated must be greater than or equal to zero"),
  powerPlantId: z.uuid(),
});

export const updateMonthlyGenerationSchema =
  createMonthlyGenerationSchema.extend({
    month: createMonthlyGenerationSchema.shape.month.optional(),
    year: createMonthlyGenerationSchema.shape.year.optional(),
    energyGeneratedMwh:
      createMonthlyGenerationSchema.shape.energyGeneratedMwh.optional(),
    powerPlantId: createMonthlyGenerationSchema.shape.powerPlantId.optional(),
  });

export const listMonthlyGenerationsSchema = z.object({
  page: z.coerce.number().int().positive().min(1).default(1),
  limit: z.coerce.number().int().positive().min(1).max(10).default(10),
});

export type CreateMonthlyGenerationDTO = z.infer<
  typeof createMonthlyGenerationSchema
>;
export type UpdateMonthlyGenerationDTO = z.infer<
  typeof updateMonthlyGenerationSchema
>;
export type ListMonthlyGenerationsDTO = z.infer<
  typeof listMonthlyGenerationsSchema
>;
