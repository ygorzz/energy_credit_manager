import z, { email } from "zod";
import { registerUserSchema } from "../Auth/auth.dto.js";

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
export type updateUserDTO = z.infer<typeof updateUserSchema>;
