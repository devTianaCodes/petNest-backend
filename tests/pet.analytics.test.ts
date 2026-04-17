import assert from "node:assert/strict";
import test from "node:test";
import type { Request, Response } from "express";
import { ListingStatus } from "@prisma/client";
import { prisma } from "../src/lib/prisma.js";
import {
  getMyListingAnalytics,
  getPublicListingStats
} from "../src/modules/pets/pets.analytics.controller.js";

function createResponseMock() {
  return {
    body: undefined as unknown,
    json(payload: unknown) {
      this.body = payload;
      return this;
    }
  } as Response & { body: unknown };
}

test("getMyListingAnalytics summarizes listing and request stats", async () => {
  const originalFindMany = prisma.petListing.findMany;
  const originalRequestCount = prisma.adoptionRequest.count;
  const originalFavoriteCount = prisma.favorite.count;
  prisma.petListing.findMany = (async () => [
    {
      id: "listing_1",
      name: "Milo",
      status: ListingStatus.PUBLISHED,
      updatedAt: new Date("2024-02-02T00:00:00.000Z"),
      _count: {
        adoptionRequests: 4,
        favorites: 2
      }
    },
    {
      id: "listing_2",
      name: "Luna",
      status: ListingStatus.ADOPTED,
      updatedAt: new Date("2024-02-03T00:00:00.000Z"),
      _count: {
        adoptionRequests: 2,
        favorites: 2
      }
    },
    {
      id: "listing_3",
      name: "Pico",
      status: ListingStatus.DRAFT,
      updatedAt: new Date("2024-02-01T00:00:00.000Z"),
      _count: {
        adoptionRequests: 0,
        favorites: 1
      }
    }
  ]) as unknown as typeof prisma.petListing.findMany;
  let requestCountCall = 0;
  prisma.adoptionRequest.count = (async () => {
    requestCountCall += 1;
    if (requestCountCall === 1) return 6;
    if (requestCountCall === 2) return 2;
    return 1;
  }) as unknown as typeof prisma.adoptionRequest.count;
  prisma.favorite.count = (async () => 5) as unknown as typeof prisma.favorite.count;

  try {
    const req = {
      user: { id: "user_1" }
    } as unknown as Request;
    const res = createResponseMock();

    await getMyListingAnalytics(req, res);

    const body = res.body as {
      stats: {
        totalListings: number;
        draftListings: number;
        pendingListings: number;
        publishedListings: number;
        rejectedListings: number;
        adoptedListings: number;
        totalRequestsReceived: number;
        pendingRequestsReceived: number;
        approvedRequestsReceived: number;
        totalFavoritesReceived: number;
      };
      topListings: Array<{ id: string; requestCount: number; favoriteCount: number }>;
    };

    assert.deepEqual(body.stats, {
      totalListings: 3,
      draftListings: 1,
      pendingListings: 0,
      publishedListings: 1,
      rejectedListings: 0,
      adoptedListings: 1,
      totalRequestsReceived: 6,
      pendingRequestsReceived: 2,
      approvedRequestsReceived: 1,
      totalFavoritesReceived: 5
    });
    assert.deepEqual(
      body.topListings.map((item) => item.id),
      ["listing_1", "listing_2", "listing_3"]
    );
  } finally {
    prisma.petListing.findMany = originalFindMany;
    prisma.adoptionRequest.count = originalRequestCount;
    prisma.favorite.count = originalFavoriteCount;
  }
});

test("getPublicListingStats returns homepage metrics", async () => {
  const originalListingCount = prisma.petListing.count;
  const originalFavoriteCount = prisma.favorite.count;
  const originalRequestCount = prisma.adoptionRequest.count;
  let listingCountCall = 0;
  prisma.petListing.count = (async () => {
    listingCountCall += 1;
    if (listingCountCall === 1) return 12;
    if (listingCountCall === 2) return 34;
    return 3;
  }) as unknown as typeof prisma.petListing.count;
  prisma.favorite.count = (async () => 21) as unknown as typeof prisma.favorite.count;
  prisma.adoptionRequest.count = (async () => 18) as unknown as typeof prisma.adoptionRequest.count;

  try {
    const res = createResponseMock();

    await getPublicListingStats({} as Request, res);

    assert.deepEqual(res.body, {
      stats: {
        publishedListings: 12,
        adoptedListings: 34,
        pendingListings: 3,
        totalFavorites: 21,
        totalRequests: 18
      }
    });
  } finally {
    prisma.petListing.count = originalListingCount;
    prisma.favorite.count = originalFavoriteCount;
    prisma.adoptionRequest.count = originalRequestCount;
  }
});
