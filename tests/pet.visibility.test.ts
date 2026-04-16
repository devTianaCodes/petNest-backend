import assert from "node:assert/strict";
import test from "node:test";
import { ListingStatus } from "@prisma/client";
import type { Request, Response } from "express";
import { prisma } from "../src/lib/prisma.js";
import { getListingById, getPublicListings } from "../src/modules/pets/pets.controller.js";

function createResponseMock() {
  return {
    statusCode: 200,
    body: undefined as unknown,
    json(payload: unknown) {
      this.body = payload;
      return this;
    }
  } as Response & { statusCode: number; body: unknown };
}

test("public listings hide private contact fields", async () => {
  const originalTransaction = prisma.$transaction;
  prisma.$transaction = (async () => [
    [
      {
        id: "listing_1",
        name: "Milo",
        status: ListingStatus.PUBLISHED,
        contactEmail: "private@petnest.app",
        contactPhone: "1234567890"
      }
    ],
    1
  ]) as unknown as typeof prisma.$transaction;

  try {
    const req = {
      query: {
        page: 1,
        limit: 12
      }
    } as unknown as Request;
    const res = createResponseMock();

    await getPublicListings(req, res);

    const listing = (res.body as { items: Array<{ contactEmail?: string; contactPhone?: string }> }).items[0];
    assert.equal(listing.contactEmail, undefined);
    assert.equal(listing.contactPhone, undefined);
  } finally {
    prisma.$transaction = originalTransaction;
  }
});

test("public listing details hide private contact fields for non-owners", async () => {
  const originalFindUnique = prisma.petListing.findUnique;
  prisma.petListing.findUnique = (async () => ({
    id: "listing_1",
    ownerId: "owner_1",
    status: ListingStatus.PUBLISHED,
    contactEmail: "private@petnest.app",
    contactPhone: "1234567890"
  })) as unknown as typeof prisma.petListing.findUnique;

  try {
    const req = {
      params: { id: "listing_1" },
      user: {
        id: "viewer_1",
        email: "viewer@petnest.app",
        role: "USER",
        status: "ACTIVE",
        isEmailVerified: true
      }
    } as unknown as Request;
    const res = createResponseMock();

    await getListingById(req, res);

    const listing = (res.body as { listing: { contactEmail?: string; contactPhone?: string } }).listing;
    assert.equal(listing.contactEmail, undefined);
    assert.equal(listing.contactPhone, undefined);
  } finally {
    prisma.petListing.findUnique = originalFindUnique;
  }
});

test("owners can still view private contact fields on their own listings", async () => {
  const originalFindUnique = prisma.petListing.findUnique;
  prisma.petListing.findUnique = (async () => ({
    id: "listing_1",
    ownerId: "owner_1",
    status: ListingStatus.PUBLISHED,
    contactEmail: "private@petnest.app",
    contactPhone: "1234567890"
  })) as unknown as typeof prisma.petListing.findUnique;

  try {
    const req = {
      params: { id: "listing_1" },
      user: {
        id: "owner_1",
        email: "owner@petnest.app",
        role: "USER",
        status: "ACTIVE",
        isEmailVerified: true
      }
    } as unknown as Request;
    const res = createResponseMock();

    await getListingById(req, res);

    const listing = (res.body as { listing: { contactEmail?: string; contactPhone?: string } }).listing;
    assert.equal(listing.contactEmail, "private@petnest.app");
    assert.equal(listing.contactPhone, "1234567890");
  } finally {
    prisma.petListing.findUnique = originalFindUnique;
  }
});

test("unpublished listing details stay hidden from non-owners", async () => {
  const originalFindUnique = prisma.petListing.findUnique;
  prisma.petListing.findUnique = (async () => ({
    id: "listing_1",
    ownerId: "owner_1",
    status: ListingStatus.PENDING_APPROVAL,
    contactEmail: "private@petnest.app",
    contactPhone: "1234567890"
  })) as unknown as typeof prisma.petListing.findUnique;

  try {
    const req = {
      params: { id: "listing_1" },
      user: {
        id: "viewer_1",
        email: "viewer@petnest.app",
        role: "USER",
        status: "ACTIVE",
        isEmailVerified: true
      }
    } as unknown as Request;

    await assert.rejects(() => getListingById(req, createResponseMock()), {
      message: "Listing not found"
    });
  } finally {
    prisma.petListing.findUnique = originalFindUnique;
  }
});
