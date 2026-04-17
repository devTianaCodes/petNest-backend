import type { Request, Response } from "express";
import { ListingStatus, Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../utils/http.js";

const favoriteListingInclude = {
  category: true,
  images: { orderBy: { sortOrder: "asc" as const } },
  owner: {
    select: {
      id: true,
      fullName: true,
      city: true,
      state: true
    }
  }
} satisfies Prisma.PetListingInclude;

function sanitizeFavoriteListing<T extends { contactEmail?: string | null; contactPhone?: string | null }>(listing: T) {
  return {
    ...listing,
    contactEmail: undefined,
    contactPhone: undefined
  };
}

export async function getFavorites(req: Request, res: Response) {
  const items = await prisma.favorite.findMany({
    where: { userId: req.user!.id },
    include: {
      listing: {
        include: favoriteListingInclude
      }
    },
    orderBy: { createdAt: "desc" }
  });

  return res.json({
    items: items.map((item) => ({
      ...item,
      listing: sanitizeFavoriteListing(item.listing)
    }))
  });
}

export async function addFavorite(req: Request, res: Response) {
  const listingId = String(req.params.listingId);
  const listing = await prisma.petListing.findUnique({
    where: { id: listingId },
    select: { id: true, status: true }
  });

  if (!listing || listing.status !== ListingStatus.PUBLISHED) {
    throw new AppError(404, "Listing not found");
  }

  const favorite = await prisma.favorite.upsert({
    where: {
      userId_listingId: {
        userId: req.user!.id,
        listingId
      }
    },
    update: {},
    create: {
      userId: req.user!.id,
      listingId
    }
  });

  return res.status(201).json({ favorite });
}

export async function removeFavorite(req: Request, res: Response) {
  const listingId = String(req.params.listingId);

  await prisma.favorite.deleteMany({
    where: {
      userId: req.user!.id,
      listingId
    }
  });

  return res.status(204).send();
}
