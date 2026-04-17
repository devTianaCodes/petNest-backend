import type { Request, Response } from "express";
import { ListingStatus, UserStatus } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../utils/http.js";

async function writeAuditLog(adminUserId: string, action: string, entityType: string, entityId: string, metadata?: string) {
  await prisma.auditLog.create({
    data: {
      adminUserId,
      action,
      entityType,
      entityId,
      metadata
    }
  });
}

export async function getPendingListings(_req: Request, res: Response) {
  const items = await prisma.petListing.findMany({
    where: { status: ListingStatus.PENDING_APPROVAL },
    include: {
      category: true,
      images: true,
      owner: {
        select: { id: true, fullName: true, email: true, city: true, state: true }
      }
    },
    orderBy: { createdAt: "asc" }
  });

  return res.json({ items });
}

export async function approveListing(req: Request, res: Response) {
  const listingId = String(req.params.id);
  const listing = await prisma.petListing.findUnique({
    where: { id: listingId }
  });

  if (!listing || listing.status !== ListingStatus.PENDING_APPROVAL) {
    throw new AppError(404, "Pending listing not found");
  }

  const updated = await prisma.petListing.update({
    where: { id: listingId },
    data: {
      status: ListingStatus.PUBLISHED,
      approvedAt: new Date(),
      approvedByAdminId: req.user!.id,
      publishedAt: new Date(),
      rejectionReason: null
    }
  });

  await writeAuditLog(req.user!.id, "listing_approved", "PetListing", updated.id);
  return res.json({ listing: updated });
}

export async function rejectListing(req: Request, res: Response) {
  const listingId = String(req.params.id);
  const listing = await prisma.petListing.findUnique({
    where: { id: listingId }
  });

  if (!listing || listing.status !== ListingStatus.PENDING_APPROVAL) {
    throw new AppError(404, "Pending listing not found");
  }

  const updated = await prisma.petListing.update({
    where: { id: listingId },
    data: {
      status: ListingStatus.REJECTED,
      rejectionReason: req.body.rejectionReason,
      approvedAt: null,
      approvedByAdminId: null,
      publishedAt: null
    }
  });

  await writeAuditLog(req.user!.id, "listing_rejected", "PetListing", updated.id, req.body.rejectionReason);
  return res.json({ listing: updated });
}

export async function getUsers(_req: Request, res: Response) {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      fullName: true,
      email: true,
      city: true,
      state: true,
      role: true,
      status: true,
      isEmailVerified: true,
      createdAt: true
    },
    orderBy: { createdAt: "desc" }
  });

  return res.json({ users });
}

export async function updateUserStatus(req: Request, res: Response) {
  const userId = String(req.params.id);
  const nextStatus = req.body.status as UserStatus;
  const user = await prisma.user.findUnique({
    where: { id: userId }
  });

  if (!user || user.role === "ADMIN") {
    throw new AppError(404, "User not found");
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { status: nextStatus }
  });

  await writeAuditLog(req.user!.id, nextStatus === UserStatus.SUSPENDED ? "user_suspended" : "user_activated", "User", updated.id);
  return res.json({ user: updated });
}
