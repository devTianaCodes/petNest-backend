import type { Request, Response } from "express";
import { AdoptionRequestStatus, ListingStatus } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../utils/http.js";

export async function createAdoptionRequest(req: Request, res: Response) {
  const listingId = String(req.params.id);
  const listing = await prisma.petListing.findUnique({
    where: { id: listingId }
  });

  if (!listing || listing.status !== ListingStatus.PUBLISHED) {
    throw new AppError(404, "Listing not found");
  }

  if (listing.ownerId === req.user!.id) {
    throw new AppError(400, "You cannot request your own listing");
  }

  const duplicate = await prisma.adoptionRequest.findFirst({
    where: {
      listingId: listing.id,
      requesterId: req.user!.id,
      status: {
        in: [AdoptionRequestStatus.PENDING, AdoptionRequestStatus.CONTACTED, AdoptionRequestStatus.APPROVED]
      }
    }
  });

  if (duplicate) {
    throw new AppError(409, "You already have an active request for this listing");
  }

  const request = await prisma.adoptionRequest.create({
    data: {
      listingId: listing.id,
      requesterId: req.user!.id,
      ...req.body,
      housingType: req.body.housingType || null
    }
  });

  return res.status(201).json({ request });
}

export async function getIncomingRequests(req: Request, res: Response) {
  const items = await prisma.adoptionRequest.findMany({
    where: { listing: { ownerId: req.user!.id } },
    include: {
      listing: true,
      requester: {
        select: {
          id: true,
          fullName: true,
          email: true,
          phone: true,
          city: true,
          state: true
        }
      }
    },
    orderBy: { createdAt: "desc" }
  });

  return res.json({ items });
}

export async function getOutgoingRequests(req: Request, res: Response) {
  const items = await prisma.adoptionRequest.findMany({
    where: { requesterId: req.user!.id },
    include: {
      listing: {
        include: {
          images: true,
          category: true
        }
      }
    },
    orderBy: { createdAt: "desc" }
  });

  return res.json({ items });
}

export async function updateAdoptionRequestStatus(req: Request, res: Response) {
  const requestId = String(req.params.id);
  const request = await prisma.adoptionRequest.findUnique({
    where: { id: requestId },
    include: { listing: true }
  });

  if (!request) {
    throw new AppError(404, "Adoption request not found");
  }

  const isOwner = request.listing.ownerId === req.user!.id;
  const isRequester = request.requesterId === req.user!.id;
  const nextStatus = req.body.status as AdoptionRequestStatus;

  if (!isOwner && !isRequester) {
    throw new AppError(403, "Forbidden");
  }

  if (isRequester && nextStatus !== AdoptionRequestStatus.WITHDRAWN) {
    throw new AppError(403, "Requesters can only withdraw their own requests");
  }

  const updated = await prisma.adoptionRequest.update({
    where: { id: request.id },
    data: { status: nextStatus }
  });

  return res.json({ request: updated });
}
