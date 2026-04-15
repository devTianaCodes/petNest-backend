import type { Request, Response } from "express";
import { prisma } from "../../lib/prisma.js";

export async function updateProfile(req: Request, res: Response) {
  const user = await prisma.user.update({
    where: { id: req.user!.id },
    data: {
      fullName: req.body.fullName,
      phone: req.body.phone || null,
      city: req.body.city || null,
      state: req.body.state || null
    },
    select: {
      id: true,
      fullName: true,
      email: true,
      phone: true,
      city: true,
      state: true,
      role: true,
      isEmailVerified: true
    }
  });

  return res.json({ user });
}
