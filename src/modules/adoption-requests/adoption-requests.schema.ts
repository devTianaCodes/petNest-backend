import { AdoptionRequestStatus } from "@prisma/client";
import { z } from "zod";

export const createAdoptionRequestSchema = z.object({
  message: z.string().trim().min(20).max(2000),
  housingType: z.string().trim().max(80).optional().or(z.literal("")),
  hasOtherPets: z.boolean().optional(),
  hasChildren: z.boolean().optional()
});

export const updateAdoptionRequestStatusSchema = z.object({
  status: z.enum([
    AdoptionRequestStatus.CONTACTED,
    AdoptionRequestStatus.APPROVED,
    AdoptionRequestStatus.REJECTED,
    AdoptionRequestStatus.WITHDRAWN
  ])
});
