import assert from "node:assert/strict";
import test from "node:test";
import type { Request, Response } from "express";
import { ListingStatus } from "@prisma/client";
import { prisma } from "../src/lib/prisma.js";
import { addFavorite, getFavorites, removeFavorite } from "../src/modules/favorites/favorites.controller.js";

function createResponseMock() {
  return {
    statusCode: 200,
    body: undefined as unknown,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: unknown) {
      this.body = payload;
      return this;
    },
    send() {
      return this;
    }
  } as Response & { statusCode: number; body: unknown };
}

test("addFavorite rejects unpublished listings", async () => {
  const originalFindUnique = prisma.petListing.findUnique;
  prisma.petListing.findUnique = (async () => ({
    id: "pet_1",
    status: ListingStatus.DRAFT
  })) as unknown as typeof prisma.petListing.findUnique;

  try {
    const req = {
      params: { listingId: "pet_1" },
      user: { id: "user_1" }
    } as unknown as Request;
    const res = createResponseMock();

    await assert.rejects(() => addFavorite(req, res), /Listing not found/);
  } finally {
    prisma.petListing.findUnique = originalFindUnique;
  }
});

test("getFavorites sanitizes private contact fields", async () => {
  const originalFindMany = prisma.favorite.findMany;
  prisma.favorite.findMany = (async () => [
    {
      id: "fav_1",
      createdAt: new Date("2024-01-01T00:00:00.000Z"),
      listing: {
        id: "pet_1",
        name: "Milo",
        city: "Austin",
        state: "Texas",
        contactEmail: "private@petnest.local",
        contactPhone: "1234567890",
        category: { id: "cat_1", name: "Dog", slug: "dog", isActive: true, createdAt: new Date(), updatedAt: new Date() },
        images: [],
        owner: { id: "user_2", fullName: "Rescuer", city: "Austin", state: "Texas" }
      }
    }
  ]) as unknown as typeof prisma.favorite.findMany;

  try {
    const req = {
      user: { id: "user_1" }
    } as unknown as Request;
    const res = createResponseMock();

    await getFavorites(req, res);

    const listing = (res.body as { items: Array<{ listing: { contactEmail?: string; contactPhone?: string } }> }).items[0].listing;
    assert.equal(listing.contactEmail, undefined);
    assert.equal(listing.contactPhone, undefined);
  } finally {
    prisma.favorite.findMany = originalFindMany;
  }
});

test("removeFavorite returns 204 for the current user and listing", async () => {
  const originalDeleteMany = prisma.favorite.deleteMany;
  let receivedWhere: Record<string, unknown> | undefined;
  prisma.favorite.deleteMany = (async (input: { where: unknown }) => {
    receivedWhere = input.where as Record<string, unknown>;
    return { count: 1 };
  }) as unknown as typeof prisma.favorite.deleteMany;

  try {
    const req = {
      params: { listingId: "pet_1" },
      user: { id: "user_1" }
    } as unknown as Request;
    const res = createResponseMock();

    await removeFavorite(req, res);

    assert.deepEqual(receivedWhere, {
      userId: "user_1",
      listingId: "pet_1"
    });
    assert.equal(res.statusCode, 204);
  } finally {
    prisma.favorite.deleteMany = originalDeleteMany;
  }
});
