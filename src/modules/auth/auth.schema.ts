import { z } from "zod";

export const registerSchema = z.object({
  fullName: z.string().trim().min(2).max(80),
  email: z.string().trim().email(),
  password: z
    .string()
    .min(8)
    .max(100)
    .regex(/[A-Za-z]/, "Password must contain a letter")
    .regex(/\d/, "Password must contain a number")
});

export const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(8).max(100)
});

export const verifyEmailSchema = z.object({
  token: z.string().min(16)
});
