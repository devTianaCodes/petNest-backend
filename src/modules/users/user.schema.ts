import { z } from "zod";

export const updateProfileSchema = z.object({
  fullName: z.string().trim().min(2).max(80).optional(),
  phone: z.string().trim().min(7).max(20).optional().or(z.literal("")),
  city: z.string().trim().min(2).max(60).optional().or(z.literal("")),
  state: z.string().trim().min(2).max(60).optional().or(z.literal(""))
});
