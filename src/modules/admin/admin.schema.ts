import { z } from "zod";

export const rejectListingSchema = z.object({
  rejectionReason: z.string().trim().min(10).max(500)
});

export const updateUserStatusSchema = z.object({
  status: z.enum(["ACTIVE", "SUSPENDED"])
});
