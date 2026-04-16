import assert from "node:assert/strict";
import test from "node:test";
import { ListingStatus } from "@prisma/client";
import type { Request, Response } from "express";
import { prisma } from "../src/lib/prisma.js";
import { submitListing } from "../src/modules/pets/pets.controller.js";

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

test("submitListing requires a draft or rejected listing for submission", async () => {
  const originalFindUnique = prisma.petListing.findUnique;
  prisma.petListing.findUnique = (async () => ({
    id: "listing_1",
    ownerId: "user_1",
    status: ListingStatus.PUBLISHED,
    images: [{ id: "img_1" }]
  })) as unknown as typeof prisma.petListing.findUnique;

  try {
    const req = {
      params: { id: "listing_1" },
      body: { action: "submit" },
      user: {
        id: "user_1",
        email: "user@petnest.app",
        role: "USER",
        status: "ACTIVE",
        isEmailVerified: true
      }
    } as unknown as Request;

    await assert.rejects(() => submitListing(req, createResponseMock()), {
      message: "Only draft or rejected listings can be submitted"
    });
  } finally {
    prisma.petListing.findUnique = originalFindUnique;
  }
});

test("submitListing requires email verification and at least one image", async () => {
  const originalFindUnique = prisma.petListing.findUnique;
  prisma.petListing.findUnique = (async () => ({
    id: "listing_1",
    ownerId: "user_1",
    status: ListingStatus.DRAFT,
    images: []
  })) as unknown as typeof prisma.petListing.findUnique;

  try {
    const req = {
      params: { id: "listing_1" },
      body: { action: "submit" },
      user: {
        id: "user_1",
        email: "user@petnest.app",
        role: "USER",
        status: "ACTIVE",
        isEmailVerified: false
      }
    } as unknown as Request;

    await assert.rejects(() => submitListing(req, createResponseMock()), {
      message: "Verify your email before submitting a listing"
    });

    req.user!.isEmailVerified = true;

    await assert.rejects(() => submitListing(req, createResponseMock()), {
      message: "At least one image is required before submission"
    });
  } finally {
    prisma.petListing.findUnique = originalFindUnique;
  }
});

test("submitListing only allows mark-adopted from published listings", async () => {
  const originalFindUnique = prisma.petListing.findUnique;
  prisma.petListing.findUnique = (async () => ({
    id: "listing_1",
    ownerId: "user_1",
    status: ListingStatus.REJECTED,
    images: [{ id: "img_1" }]
  })) as unknown as typeof prisma.petListing.findUnique;

  try {
    const req = {
      params: { id: "listing_1" },
      body: { action: "mark-adopted" },
      user: {
        id: "user_1",
        email: "user@petnest.app",
        role: "USER",
        status: "ACTIVE",
        isEmailVerified: true
      }
    } as unknown as Request;

    await assert.rejects(() => submitListing(req, createResponseMock()), {
      message: "Only published listings can be marked as adopted"
    });
  } finally {
    prisma.petListing.findUnique = originalFindUnique;
  }
});

test("submitListing updates to adopted for published listings", async () => {
  const originalFindUnique = prisma.petListing.findUnique;
  const originalUpdate = prisma.petListing.update;
  prisma.petListing.findUnique = (async () => ({
    id: "listing_1",
    ownerId: "user_1",
    status: ListingStatus.PUBLISHED,
    images: [{ id: "img_1" }]
  })) as unknown as typeof prisma.petListing.findUnique;
  prisma.petListing.update = (async () => ({
    id: "listing_1",
    status: ListingStatus.ADOPTED
  })) as unknown as typeof prisma.petListing.update;

  try {
    const req = {
      params: { id: "listing_1" },
      body: { action: "mark-adopted" },
      user: {
        id: "user_1",
        email: "user@petnest.app",
        role: "USER",
        status: "ACTIVE",
        isEmailVerified: true
      }
    } as unknown as Request;
    const res = createResponseMock();

    await submitListing(req, res);

    assert.equal((res.body as { listing: { status: ListingStatus } }).listing.status, ListingStatus.ADOPTED);
  } finally {
    prisma.petListing.findUnique = originalFindUnique;
    prisma.petListing.update = originalUpdate;
  }
});
