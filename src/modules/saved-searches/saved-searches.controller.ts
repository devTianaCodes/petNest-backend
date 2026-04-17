import type { Request, Response } from "express";
import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../utils/http.js";

export async function getSavedSearches(req: Request, res: Response) {
  const items = await prisma.savedSearch.findMany({
    where: { userId: req.user!.id },
    orderBy: { createdAt: "desc" }
  });

  return res.json({ items });
}

export async function createSavedSearch(req: Request, res: Response) {
  const savedSearch = await prisma.savedSearch.create({
    data: {
      userId: req.user!.id,
      label: req.body.label,
      queryString: req.body.queryString
    }
  });

  return res.status(201).json({ savedSearch });
}

export async function deleteSavedSearch(req: Request, res: Response) {
  const id = String(req.params.id);
  const savedSearch = await prisma.savedSearch.findUnique({
    where: { id }
  });

  if (!savedSearch || savedSearch.userId !== req.user!.id) {
    throw new AppError(404, "Saved search not found");
  }

  await prisma.savedSearch.delete({
    where: { id }
  });

  return res.status(204).send();
}
