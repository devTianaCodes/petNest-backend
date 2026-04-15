import type { Request, Response } from "express";
import { ListingStatus, Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../utils/http.js";

const listingInclude = {
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

function sanitizePublicListing<T extends { contactEmail?: string | null; contactPhone?: string | null }>(listing: T) {
  return {
    ...listing,
    contactEmail: undefined,
    contactPhone: undefined
  };
}

export async function getPublicListings(req: Request, res: Response) {
  const query = req.query as unknown as {
    category?: string;
    city?: string;
    state?: string;
    sex?: string;
    size?: string;
    search?: string;
    page: number;
    limit: number;
  };

  const where: Prisma.PetListingWhereInput = {
    status: ListingStatus.PUBLISHED,
    ...(query.category ? { category: { slug: query.category } } : {}),
    ...(query.city ? { city: { contains: query.city } } : {}),
    ...(query.state ? { state: { contains: query.state } } : {}),
    ...(query.sex ? { sex: query.sex as never } : {}),
    ...(query.size ? { size: query.size as never } : {}),
    ...(query.search
      ? {
          OR: [
            { name: { contains: query.search } },
            { description: { contains: query.search } },
            { breed: { contains: query.search } }
          ]
        }
      : {})
  };

  const [items, total] = await prisma.$transaction([
    prisma.petListing.findMany({
      where,
      include: listingInclude,
      skip: (query.page - 1) * query.limit,
      take: query.limit,
      orderBy: { createdAt: "desc" }
    }),
    prisma.petListing.count({ where })
  ]);

  return res.json({
    items: items.map((item) => sanitizePublicListing(item)),
    pagination: {
      page: query.page,
      limit: query.limit,
      total
    }
  });
}

export async function getListingById(req: Request, res: Response) {
  const listingId = String(req.params.id);
  const listing = await prisma.petListing.findUnique({
    where: { id: listingId },
    include: listingInclude
  });

  if (!listing) {
    throw new AppError(404, "Listing not found");
  }

  const isOwner = req.user?.id === listing.ownerId;
  const isAdmin = req.user?.role === "ADMIN";

  if (listing.status !== ListingStatus.PUBLISHED && !isOwner && !isAdmin) {
    throw new AppError(404, "Listing not found");
  }

  return res.json({
    listing: isOwner || isAdmin ? listing : sanitizePublicListing(listing)
  });
}

export async function createListing(req: Request, res: Response) {
  const listing = await prisma.petListing.create({
    data: {
      ownerId: req.user!.id,
      ...req.body,
      breed: req.body.breed || null,
      contactPhone: req.body.contactPhone || null,
      rescueStory: req.body.rescueStory || null,
      healthNotes: req.body.healthNotes || null
    }
  });

  return res.status(201).json({ listing });
}

export async function updateListing(req: Request, res: Response) {
  const listingId = String(req.params.id);
  const currentListing = await prisma.petListing.findUnique({
    where: { id: listingId },
    include: { images: true }
  });

  if (!currentListing || currentListing.ownerId !== req.user!.id) {
    throw new AppError(404, "Listing not found");
  }

  if (currentListing.status === ListingStatus.PUBLISHED || currentListing.status === ListingStatus.PENDING_APPROVAL) {
    throw new AppError(400, "Published or pending listings cannot be edited directly");
  }

  const listing = await prisma.petListing.update({
    where: { id: listingId },
    data: {
      ...req.body,
      breed: req.body.breed || null,
      contactPhone: req.body.contactPhone || null,
      rescueStory: req.body.rescueStory || null,
      healthNotes: req.body.healthNotes || null
    }
  });

  return res.json({ listing });
}

export async function deleteListing(req: Request, res: Response) {
  const listingId = String(req.params.id);
  const currentListing = await prisma.petListing.findUnique({
    where: { id: listingId }
  });

  if (!currentListing || currentListing.ownerId !== req.user!.id) {
    throw new AppError(404, "Listing not found");
  }

  await prisma.petListing.delete({ where: { id: listingId } });
  return res.status(204).send();
}

export async function submitListing(req: Request, res: Response) {
  const listingId = String(req.params.id);
  const currentListing = await prisma.petListing.findUnique({
    where: { id: listingId },
    include: { images: true }
  });

  if (!currentListing || currentListing.ownerId !== req.user!.id) {
    throw new AppError(404, "Listing not found");
  }

  if (!req.user!.isEmailVerified) {
    throw new AppError(403, "Verify your email before submitting a listing");
  }

  if (currentListing.images.length === 0) {
    throw new AppError(400, "At least one image is required before submission");
  }

  const listing = await prisma.petListing.update({
    where: { id: listingId },
    data: {
      status: req.body.action === "mark-adopted" ? ListingStatus.ADOPTED : ListingStatus.PENDING_APPROVAL
    }
  });

  return res.json({ listing });
}

export async function getMyListings(req: Request, res: Response) {
  const items = await prisma.petListing.findMany({
    where: { ownerId: req.user!.id },
    include: { category: true, images: true },
    orderBy: { createdAt: "desc" }
  });

  return res.json({ items });
}
