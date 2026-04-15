import type { Request, Response } from "express";
import { prisma } from "../../lib/prisma.js";
import { loginUser, logoutUser, refreshSession, registerUser, verifyEmail } from "./auth.service.js";

export async function register(req: Request, res: Response) {
  const result = await registerUser(req.body);

  return res.status(201).json({
    message: "Registration successful. Verify your email before publishing listings.",
    user: {
      id: result.user.id,
      email: result.user.email,
      fullName: result.user.fullName,
      isEmailVerified: result.user.isEmailVerified
    },
    verificationUrl: process.env.NODE_ENV === "development" ? result.verificationUrl : undefined
  });
}

export async function login(req: Request, res: Response) {
  const result = await loginUser(req.body, req, res);
  return res.json(result);
}

export async function logout(req: Request, res: Response) {
  await logoutUser(req, res);
  return res.status(204).send();
}

export async function refresh(req: Request, res: Response) {
  const result = await refreshSession(req, res);
  return res.json(result);
}

export async function me(req: Request, res: Response) {
  if (!req.user) {
    return res.status(401).json({ message: "Authentication required" });
  }

  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: {
      id: true,
      fullName: true,
      email: true,
      phone: true,
      city: true,
      state: true,
      role: true,
      status: true,
      isEmailVerified: true,
      createdAt: true
    }
  });

  return res.json({ user });
}

export async function verifyEmailHandler(req: Request, res: Response) {
  const result = await verifyEmail(req.body.token);
  return res.json(result);
}
