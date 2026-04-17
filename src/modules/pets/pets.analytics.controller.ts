import type { Request, Response } from "express";
import { ListingStatus, Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";

function createStatusCounts() {
  return {
    totalListings: 0,
    draftListings: 0,
    pendingListings: 0,
    publishedListings: 0,
    rejectedListings: 0,
    adoptedListings: 0
  };
}

function applyListingStatusCount(
  stats: ReturnType<typeof createStatusCounts>,
  status: ListingStatus
) {
  stats.totalListings += 1;

  if (status === ListingStatus.DRAFT) stats.draftListings += 1;
  if (status === ListingStatus.PENDING_APPROVAL) stats.pendingListings += 1;
  if (status === ListingStatus.PUBLISHED) stats.publishedListings += 1;
  if (status === ListingStatus.REJECTED) stats.rejectedListings += 1;
  if (status === ListingStatus.ADOPTED) stats.adoptedListings += 1;
}

type AnalyticsListing = {
  id: string;
  name: string;
  status: ListingStatus;
  updatedAt: Date;
  _count: {
    adoptionRequests: number;
    favorites: number;
  };
};

function sortTopListings(a: AnalyticsListing, b: AnalyticsListing) {
  const aScore = a._count.adoptionRequests + a._count.favorites;
  const bScore = b._count.adoptionRequests + b._count.favorites;

  if (aScore !== bScore) {
    return bScore - aScore;
  }

  return b.updatedAt.getTime() - a.updatedAt.getTime();
}

function isMissingTableError(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2021";
}

async function getFavoriteCountOrZero(where?: Prisma.FavoriteWhereInput) {
  try {
    return await prisma.favorite.count(where ? { where } : undefined);
  } catch (error) {
    if (isMissingTableError(error)) {
      return 0;
    }

    throw error;
  }
}

export async function getMyListingAnalytics(req: Request, res: Response) {
  const ownerId = req.user!.id;
  let listings: AnalyticsListing[];

  try {
    listings = await prisma.petListing.findMany({
      where: { ownerId },
      select: {
        id: true,
        name: true,
        status: true,
        updatedAt: true,
        _count: {
          select: {
            adoptionRequests: true,
            favorites: true
          }
        }
      }
    });
  } catch (error) {
    if (!isMissingTableError(error)) {
      throw error;
    }

    const fallbackListings = await prisma.petListing.findMany({
      where: { ownerId },
      select: {
        id: true,
        name: true,
        status: true,
        updatedAt: true,
        _count: {
          select: {
            adoptionRequests: true
          }
        }
      }
    });

    listings = fallbackListings.map((listing) => ({
      ...listing,
      _count: {
        adoptionRequests: listing._count.adoptionRequests,
        favorites: 0
      }
    }));
  }

  const [totalRequestsReceived, pendingRequestsReceived, approvedRequestsReceived, totalFavoritesReceived] =
    await Promise.all([
      prisma.adoptionRequest.count({
        where: { listing: { ownerId } }
      }),
      prisma.adoptionRequest.count({
        where: {
          listing: { ownerId },
          status: "PENDING"
        }
      }),
      prisma.adoptionRequest.count({
        where: {
          listing: { ownerId },
          status: "APPROVED"
        }
      }),
      getFavoriteCountOrZero({
        listing: { ownerId }
      })
    ]);

  const listingStats = listings.reduce((stats, listing) => {
    applyListingStatusCount(stats, listing.status);
    return stats;
  }, createStatusCounts());

  const topListings = [...listings]
    .sort(sortTopListings)
    .slice(0, 5)
    .map((listing) => ({
      id: listing.id,
      name: listing.name,
      status: listing.status,
      updatedAt: listing.updatedAt,
      requestCount: listing._count.adoptionRequests,
      favoriteCount: listing._count.favorites
    }));

  return res.json({
    stats: {
      ...listingStats,
      totalRequestsReceived,
      pendingRequestsReceived,
      approvedRequestsReceived,
      totalFavoritesReceived
    },
    topListings
  });
}

export async function getPublicListingStats(_req: Request, res: Response) {
  const [publishedListings, adoptedListings, pendingListings, totalFavorites, totalRequests] =
    await Promise.all([
      prisma.petListing.count({
        where: { status: ListingStatus.PUBLISHED }
      }),
      prisma.petListing.count({
        where: { status: ListingStatus.ADOPTED }
      }),
      prisma.petListing.count({
        where: { status: ListingStatus.PENDING_APPROVAL }
      }),
      getFavoriteCountOrZero(),
      prisma.adoptionRequest.count()
    ]);

  return res.json({
    stats: {
      publishedListings,
      adoptedListings,
      pendingListings,
      totalFavorites,
      totalRequests
    }
  });
}
