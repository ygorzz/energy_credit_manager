import { z } from "zod";
import {
  PowerPlantSourceTypes,
  PowerPlantStatus,
  States,
} from "../../db/generated/prisma/enums.js";

export const createPowerPlantSchema = z.object({
  name: z
    .string("Invalid power plant name")
    .trim()
    .toUpperCase()
    .min(2, "Name must contain at least 2 characters")
    .max(100, "Name must contain a maximum of 100 characters"),
  state: z.enum(States, {
    error: "Invalid state",
  }),
  city: z
    .string("Invalid city")
    .trim()
    .min(2, "City must contain at least 2 characters")
    .max(100, "City must contain a maximum of 100 characters"),
  sourceType: z.enum(PowerPlantSourceTypes, {
    error: "Invalid power plant source type",
  }),
  installedCapacityKw: z
    .number("Installed capacity must be a number")
    .positive("Installed capacity must be greater than zero"),
  status: z.enum(PowerPlantStatus).default(PowerPlantStatus.ACTIVE),
  distributorId: z.uuid("Invalid distributor ID"),
});

export const updatePowerPlantSchema = createPowerPlantSchema.extend({
    name: createPowerPlantSchema.shape.name.optional(),
    state: createPowerPlantSchema.shape.state.optional(),
    city: createPowerPlantSchema.shape.city.optional(),
    sourceType: createPowerPlantSchema.shape.sourceType.optional(),
    installedCapacityKw: createPowerPlantSchema.shape.installedCapacityKw.optional(),
    status: createPowerPlantSchema.shape.status.optional(),
    distributorId: createPowerPlantSchema.shape.distributorId.optional(),
});

export const listPowerPlantsSchema = z.object({
  page: z.coerce.number().int().positive().min(1).default(1),
  limit: z.coerce.number().int().positive().min(1).max(10).default(10),
});

export type createPowerPlantDTO = z.infer<typeof createPowerPlantSchema>;
export type updatePowerPlantDTO = z.infer<typeof updatePowerPlantSchema>;
