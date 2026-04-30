import { AgeUnit, EnergyLevel, PetSex, PetSize } from "@prisma/client";
import { z } from "zod";

const optionalBooleanQuery = z
  .enum(["true", "false"])
  .transform((value) => value === "true")
  .optional();

export const listingPayloadSchema = z.object({
  categoryId: z.string().min(1),
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().min(30).max(3000),
  ageLabel: z.string().trim().min(2).max(40),
  ageValue: z.coerce.number().int().min(0).max(99).optional().nullable(),
  ageUnit: z.nativeEnum(AgeUnit).optional().nullable(),
  sex: z.nativeEnum(PetSex).default(PetSex.UNKNOWN),
  size: z.nativeEnum(PetSize).default(PetSize.UNKNOWN),
  breedPrimary: z.string().trim().max(80).optional().or(z.literal("")),
  breedSecondary: z.string().trim().max(80).optional().or(z.literal("")),
  isMixedBreed: z.boolean().optional(),
  energyLevel: z.nativeEnum(EnergyLevel).optional().nullable(),
  houseTrained: z.boolean().optional(),
  spayedNeutered: z.boolean().optional(),
  vaccinated: z.boolean().optional(),
  city: z.string().trim().min(2).max(80),
  state: z.string().trim().min(2).max(80),
  contactEmail: z.string().trim().email(),
  contactPhone: z.string().trim().max(20).optional().or(z.literal("")),
  rescueStory: z.string().trim().max(3000).optional().or(z.literal("")),
  healthNotes: z.string().trim().max(3000).optional().or(z.literal("")),
  goodWithKids: z.boolean().optional(),
  goodWithDogs: z.boolean().optional(),
  goodWithCats: z.boolean().optional()
});

export const listingQuerySchema = z.object({
  category: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  sex: z.nativeEnum(PetSex).optional(),
  size: z.nativeEnum(PetSize).optional(),
  energyLevel: z.nativeEnum(EnergyLevel).optional(),
  goodWithKids: optionalBooleanQuery,
  goodWithDogs: optionalBooleanQuery,
  goodWithCats: optionalBooleanQuery,
  vaccinated: optionalBooleanQuery,
  spayedNeutered: optionalBooleanQuery,
  search: z.string().optional(),
  sort: z.enum(["newest", "oldest", "name-asc"]).default("newest"),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(50).default(12)
});

export const submissionSchema = z.object({
  action: z.enum(["submit", "mark-adopted"])
});
