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

function normalizeListingPayload(body: Request["body"]) {
  return {
    ...body,
    ageValue: body.ageValue ?? null,
    ageUnit: body.ageUnit ?? null,
    breedPrimary: body.breedPrimary || null,
    breedSecondary: body.breedSecondary || null,
    isMixedBreed: body.isMixedBreed ?? null,
    energyLevel: body.energyLevel ?? null,
    houseTrained: body.houseTrained ?? null,
    spayedNeutered: body.spayedNeutered ?? null,
    vaccinated: body.vaccinated ?? null,
    contactPhone: body.contactPhone || null,
    rescueStory: body.rescueStory || null,
    healthNotes: body.healthNotes || null,
    goodWithKids: body.goodWithKids ?? null,
    goodWithDogs: body.goodWithDogs ?? null,
    goodWithCats: body.goodWithCats ?? null
  };
}

export async function getPublicListings(req: Request, res: Response) {
  const query = req.query as unknown as {
    category?: string;
    city?: string;
    state?: string;
    sex?: string;
    size?: string;
    energyLevel?: string;
    goodWithKids?: boolean;
    goodWithDogs?: boolean;
    goodWithCats?: boolean;
    vaccinated?: boolean;
    spayedNeutered?: boolean;
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
    ...(query.energyLevel ? { energyLevel: query.energyLevel as never } : {}),
    ...(typeof query.goodWithKids === "boolean" ? { goodWithKids: query.goodWithKids } : {}),
    ...(typeof query.goodWithDogs === "boolean" ? { goodWithDogs: query.goodWithDogs } : {}),
    ...(typeof query.goodWithCats === "boolean" ? { goodWithCats: query.goodWithCats } : {}),
    ...(typeof query.vaccinated === "boolean" ? { vaccinated: query.vaccinated } : {}),
    ...(typeof query.spayedNeutered === "boolean" ? { spayedNeutered: query.spayedNeutered } : {}),
    ...(query.search
      ? {
          OR: [
            { name: { contains: query.search } },
            { description: { contains: query.search } },
            { breedPrimary: { contains: query.search } },
            { breedSecondary: { contains: query.search } }
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
      orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }]
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
      ...normalizeListingPayload(req.body)
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
      ...normalizeListingPayload(req.body)
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
  const action = req.body.action as "submit" | "mark-adopted";
  const currentListing = await prisma.petListing.findUnique({
    where: { id: listingId },
    include: { images: true }
  });

  if (!currentListing || currentListing.ownerId !== req.user!.id) {
    throw new AppError(404, "Listing not found");
  }

  if (action === "submit") {
    if (currentListing.status !== ListingStatus.DRAFT && currentListing.status !== ListingStatus.REJECTED) {
      throw new AppError(400, "Only draft or rejected listings can be submitted");
    }

    if (!req.user!.isEmailVerified) {
      throw new AppError(403, "Verify your email before submitting a listing");
    }

    if (currentListing.images.length === 0) {
      throw new AppError(400, "At least one image is required before submission");
    }
  }

  if (action === "mark-adopted" && currentListing.status !== ListingStatus.PUBLISHED) {
    throw new AppError(400, "Only published listings can be marked as adopted");
  }

  const listing = await prisma.petListing.update({
    where: { id: listingId },
    data: {
      status: action === "mark-adopted" ? ListingStatus.ADOPTED : ListingStatus.PENDING_APPROVAL
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
