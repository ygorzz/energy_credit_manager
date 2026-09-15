import { z } from "zod";

export const createPowerPlantSchema = z.object({
//   name
//   state
//   city
//   sourceType
//   installedCapacityKw
//   status
//   distributorId
})

export type createPowerPlantDTO = z.infer<typeof createPowerPlantSchema>;
