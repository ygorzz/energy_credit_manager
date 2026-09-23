import z from "zod";
import { Months } from "../../db/generated/prisma/enums.js";

export const createCreditAllocationSchema = z.object({
  month: z.enum(Months, {
    error: "Invalid month",
  }),

  year: z
    .number("Year must be a number")
    .int("Year must be an integer")
    .min(2000, "Year must be at least 2000")
    .max(2100, "Year must be at most 2100"),

  percentageApplied: z
    .number("Percentage applied must be a number")
    .min(0, "Percentage applied must be at least 0")
    .max(100, "Percentage applied must be at most 100")
    .nullable(),

  energyAllocatedMw: z
    .number("Energy allocated must be a number")
    .nonnegative("Energy allocated cannot be negative"),

  clientCompanyId: z.uuid("Invalid client company ID"),
});

export const updateCreditAllocationSchema = createCreditAllocationSchema.extend(
  {
    month: createCreditAllocationSchema.shape.month.optional(),
    year: createCreditAllocationSchema.shape.year.optional(),
    percentageApplied:
      createCreditAllocationSchema.shape.percentageApplied.optional(),
    energyAllocatedMw:
      createCreditAllocationSchema.shape.energyAllocatedMw.optional(),
    clientCompanyId:
      createCreditAllocationSchema.shape.clientCompanyId.optional(),
  },
);

export const listCreditAllocationsSchema = z.object({
  page: z.coerce.number().int().positive().min(1).default(1),
  limit: z.coerce.number().int().positive().min(1).max(10).default(10),
});

export type createCreditAllocationDTO = z.infer<
  typeof createCreditAllocationSchema
>;
export type updateCreditAllocationDTO = z.infer<
  typeof updateCreditAllocationSchema
>;
