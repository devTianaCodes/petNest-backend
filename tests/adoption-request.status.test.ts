import assert from "node:assert/strict";
import test from "node:test";
import { AdoptionRequestStatus } from "@prisma/client";
import type { Request, Response } from "express";
import { prisma } from "../src/lib/prisma.js";
import { updateAdoptionRequestStatus } from "../src/modules/adoption-requests/adoption-requests.controller.js";

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

test("requesters can only withdraw pending or contacted requests", async () => {
  const originalFindUnique = prisma.adoptionRequest.findUnique;
  prisma.adoptionRequest.findUnique = (async () => ({
    id: "request_1",
    status: AdoptionRequestStatus.APPROVED,
    requesterId: "user_1",
    listing: {
      ownerId: "owner_1"
    }
  })) as unknown as typeof prisma.adoptionRequest.findUnique;

  try {
    const req = {
      params: { id: "request_1" },
      body: { status: AdoptionRequestStatus.WITHDRAWN },
      user: {
        id: "user_1",
        email: "user@petnest.app",
        role: "USER",
        status: "ACTIVE",
        isEmailVerified: true
      }
    } as unknown as Request;

    await assert.rejects(() => updateAdoptionRequestStatus(req, createResponseMock()), {
      message: "Only pending or contacted requests can be withdrawn"
    });
  } finally {
    prisma.adoptionRequest.findUnique = originalFindUnique;
  }
});

test("owners cannot move terminal requests to another status", async () => {
  const originalFindUnique = prisma.adoptionRequest.findUnique;
  prisma.adoptionRequest.findUnique = (async () => ({
    id: "request_1",
    status: AdoptionRequestStatus.REJECTED,
    requesterId: "user_1",
    listing: {
      ownerId: "owner_1"
    }
  })) as unknown as typeof prisma.adoptionRequest.findUnique;

  try {
    const req = {
      params: { id: "request_1" },
      body: { status: AdoptionRequestStatus.CONTACTED },
      user: {
        id: "owner_1",
        email: "owner@petnest.app",
        role: "USER",
        status: "ACTIVE",
        isEmailVerified: true
      }
    } as unknown as Request;

    await assert.rejects(() => updateAdoptionRequestStatus(req, createResponseMock()), {
      message: "This request cannot move to the selected status"
    });
  } finally {
    prisma.adoptionRequest.findUnique = originalFindUnique;
  }
});

test("owners can approve contacted requests", async () => {
  const originalFindUnique = prisma.adoptionRequest.findUnique;
  const originalUpdate = prisma.adoptionRequest.update;
  prisma.adoptionRequest.findUnique = (async () => ({
    id: "request_1",
    status: AdoptionRequestStatus.CONTACTED,
    requesterId: "user_1",
    listing: {
      ownerId: "owner_1"
    }
  })) as unknown as typeof prisma.adoptionRequest.findUnique;
  prisma.adoptionRequest.update = (async () => ({
    id: "request_1",
    status: AdoptionRequestStatus.APPROVED
  })) as unknown as typeof prisma.adoptionRequest.update;

  try {
    const req = {
      params: { id: "request_1" },
      body: { status: AdoptionRequestStatus.APPROVED },
      user: {
        id: "owner_1",
        email: "owner@petnest.app",
        role: "USER",
        status: "ACTIVE",
        isEmailVerified: true
      }
    } as unknown as Request;
    const res = createResponseMock();

    await updateAdoptionRequestStatus(req, res);

    assert.equal((res.body as { request: { status: AdoptionRequestStatus } }).request.status, AdoptionRequestStatus.APPROVED);
  } finally {
    prisma.adoptionRequest.findUnique = originalFindUnique;
    prisma.adoptionRequest.update = originalUpdate;
  }
});
