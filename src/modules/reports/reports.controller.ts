import type { Request, Response } from "express";
import { ListingStatus, ReportStatus } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../utils/http.js";

export async function createListingReport(req: Request, res: Response) {
  const listingId = String(req.params.listingId);
  const listing = await prisma.petListing.findUnique({
    where: { id: listingId },
    select: { id: true, ownerId: true, status: true }
  });

  if (!listing || listing.status !== ListingStatus.PUBLISHED) {
    throw new AppError(404, "Listing not found");
  }

  if (listing.ownerId === req.user!.id) {
    throw new AppError(400, "You cannot report your own listing");
  }

  const existingOpenReport = await prisma.listingReport.findFirst({
    where: {
      listingId,
      reporterId: req.user!.id,
      status: ReportStatus.OPEN
    }
  });

  if (existingOpenReport) {
    throw new AppError(400, "You already have an open report for this listing");
  }

  const report = await prisma.listingReport.create({
    data: {
      listingId,
      reporterId: req.user!.id,
      reason: req.body.reason,
      details: req.body.details || null
    }
  });

  return res.status(201).json({ report });
}
