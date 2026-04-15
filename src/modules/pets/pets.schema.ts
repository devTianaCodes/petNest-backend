import { PetSex, PetSize } from "@prisma/client";
import { z } from "zod";

export const listingPayloadSchema = z.object({
  categoryId: z.string().min(1),
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().min(30).max(3000),
  ageLabel: z.string().trim().min(2).max(40),
  sex: z.nativeEnum(PetSex).default(PetSex.UNKNOWN),
  size: z.nativeEnum(PetSize).default(PetSize.UNKNOWN),
  breed: z.string().trim().max(80).optional().or(z.literal("")),
  city: z.string().trim().min(2).max(80),
  state: z.string().trim().min(2).max(80),
  contactEmail: z.string().trim().email(),
  contactPhone: z.string().trim().max(20).optional().or(z.literal("")),
  rescueStory: z.string().trim().max(3000).optional().or(z.literal("")),
  healthNotes: z.string().trim().max(3000).optional().or(z.literal("")),
  goodWithKids: z.boolean().optional(),
  goodWithPets: z.boolean().optional()
});

export const listingQuerySchema = z.object({
  category: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  sex: z.nativeEnum(PetSex).optional(),
  size: z.nativeEnum(PetSize).optional(),
  search: z.string().optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(24).default(12)
});

export const submissionSchema = z.object({
  action: z.enum(["submit", "mark-adopted"])
});
