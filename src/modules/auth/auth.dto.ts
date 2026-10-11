import { z } from "zod";

export const loginSchema = z.object({
  email: z.email("Invalid email").trim().toUpperCase(),
  password: z
    .string()
    .min(4, "Password must contain at least 4 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter.")
    .regex(/[0-9]/, "Password must contain at least one number."),
});

export type LoginDTO = z.infer<typeof loginSchema>;
