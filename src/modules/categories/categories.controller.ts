import type { Request, Response } from "express";
import { prisma } from "../../lib/prisma.js";

export async function getCategories(_req: Request, res: Response) {
  const categories = await prisma.category.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" }
  });

  return res.json({ categories });
}
