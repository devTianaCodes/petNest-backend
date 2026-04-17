import { z } from "zod";

export const reportListingSchema = z.object({
  reason: z.string().trim().min(4).max(80),
  details: z.string().trim().max(1000).optional().or(z.literal(""))
});
