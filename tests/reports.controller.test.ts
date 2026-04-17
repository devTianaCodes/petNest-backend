import assert from "node:assert/strict";
import test from "node:test";
import type { Request, Response } from "express";
import { ListingStatus, ReportStatus } from "@prisma/client";
import { prisma } from "../src/lib/prisma.js";
import { getReports, updateReportStatus } from "../src/modules/admin/admin.controller.js";
import { createListingReport } from "../src/modules/reports/reports.controller.js";

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

test("createListingReport rejects reporting your own listing", async () => {
  const originalFindUnique = prisma.petListing.findUnique;
  prisma.petListing.findUnique = (async () => ({
    id: "listing_1",
    ownerId: "user_1",
    status: ListingStatus.PUBLISHED
  })) as unknown as typeof prisma.petListing.findUnique;

  try {
    const req = {
      params: { listingId: "listing_1" },
      user: { id: "user_1" },
      body: { reason: "Spam", details: "Looks fake" }
    } as unknown as Request;
    const res = createResponseMock();

    await assert.rejects(() => createListingReport(req, res), /own listing/);
  } finally {
    prisma.petListing.findUnique = originalFindUnique;
  }
});

test("createListingReport creates a new open report", async () => {
  const originalFindUnique = prisma.petListing.findUnique;
  const originalFindFirst = prisma.listingReport.findFirst;
  const originalCreate = prisma.listingReport.create;
  let receivedData: Record<string, unknown> | undefined;
  prisma.petListing.findUnique = (async () => ({
    id: "listing_1",
    ownerId: "owner_1",
    status: ListingStatus.PUBLISHED
  })) as unknown as typeof prisma.petListing.findUnique;
  prisma.listingReport.findFirst = (async () => null) as unknown as typeof prisma.listingReport.findFirst;
  prisma.listingReport.create = (async (input: { data: unknown }) => {
    receivedData = input.data as Record<string, unknown>;
    return {
      id: "report_1",
      ...(input.data as object),
      status: ReportStatus.OPEN,
      createdAt: new Date(),
      updatedAt: new Date(),
      reviewedAt: null
    };
  }) as unknown as typeof prisma.listingReport.create;

  try {
    const req = {
      params: { listingId: "listing_1" },
      user: { id: "user_2" },
      body: { reason: "Spam", details: "Looks fake" }
    } as unknown as Request;
    const res = createResponseMock();

    await createListingReport(req, res);

    assert.deepEqual(receivedData, {
      listingId: "listing_1",
      reporterId: "user_2",
      reason: "Spam",
      details: "Looks fake"
    });
    assert.equal(res.statusCode, 201);
  } finally {
    prisma.petListing.findUnique = originalFindUnique;
    prisma.listingReport.findFirst = originalFindFirst;
    prisma.listingReport.create = originalCreate;
  }
});

test("getReports returns admin review data", async () => {
  const originalFindMany = prisma.listingReport.findMany;
  prisma.listingReport.findMany = (async () => [
    {
      id: "report_1",
      reason: "Spam",
      details: "Looks fake",
      status: ReportStatus.OPEN,
      createdAt: new Date(),
      updatedAt: new Date(),
      reviewedAt: null,
      listing: {
        id: "listing_1",
        name: "Milo",
        city: "Austin",
        state: "Texas",
        status: ListingStatus.PUBLISHED,
        category: { id: "cat_1", name: "Dog", slug: "dog", isActive: true, createdAt: new Date(), updatedAt: new Date() },
        images: [],
        owner: { id: "owner_1", fullName: "Rescuer", city: "Austin", state: "Texas" }
      },
      reporter: {
        id: "user_2",
        fullName: "Reporter",
        email: "reporter@petnest.local",
        city: "Dallas",
        state: "Texas"
      }
    }
  ]) as unknown as typeof prisma.listingReport.findMany;

  try {
    const res = createResponseMock();
    await getReports({} as Request, res);
    assert.equal((res.body as { items: Array<{ id: string }> }).items[0].id, "report_1");
  } finally {
    prisma.listingReport.findMany = originalFindMany;
  }
});

test("updateReportStatus resolves an open report", async () => {
  const originalFindUnique = prisma.listingReport.findUnique;
  const originalUpdate = prisma.listingReport.update;
  const originalAuditCreate = prisma.auditLog.create;
  let updatedStatus: string | undefined;
  prisma.listingReport.findUnique = (async () => ({
    id: "report_1",
    status: ReportStatus.OPEN
  })) as unknown as typeof prisma.listingReport.findUnique;
  prisma.listingReport.update = (async (input: { data: { status: ReportStatus } }) => {
    updatedStatus = input.data.status;
    return {
      id: "report_1",
      status: input.data.status
    };
  }) as unknown as typeof prisma.listingReport.update;
  prisma.auditLog.create = (async () => ({ id: "audit_1" })) as unknown as typeof prisma.auditLog.create;

  try {
    const req = {
      params: { id: "report_1" },
      user: { id: "admin_1" },
      body: { status: "RESOLVED" }
    } as unknown as Request;
    const res = createResponseMock();

    await updateReportStatus(req, res);

    assert.equal(updatedStatus, "RESOLVED");
    assert.equal((res.body as { report: { id: string } }).report.id, "report_1");
  } finally {
    prisma.listingReport.findUnique = originalFindUnique;
    prisma.listingReport.update = originalUpdate;
    prisma.auditLog.create = originalAuditCreate;
  }
});
