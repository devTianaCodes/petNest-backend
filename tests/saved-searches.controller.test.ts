import assert from "node:assert/strict";
import test from "node:test";
import type { Request, Response } from "express";
import { prisma } from "../src/lib/prisma.js";
import {
  createSavedSearch,
  deleteSavedSearch,
  getSavedSearches
} from "../src/modules/saved-searches/saved-searches.controller.js";

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

test("getSavedSearches returns current user searches newest first", async () => {
  const originalFindMany = prisma.savedSearch.findMany;
  prisma.savedSearch.findMany = (async () => [
    {
      id: "search_1",
      userId: "user_1",
      label: "Cats in Austin",
      queryString: "category=cat&city=Austin",
      createdAt: new Date("2024-02-01T00:00:00.000Z"),
      updatedAt: new Date("2024-02-01T00:00:00.000Z")
    }
  ]) as unknown as typeof prisma.savedSearch.findMany;

  try {
    const req = {
      user: { id: "user_1" }
    } as unknown as Request;
    const res = createResponseMock();

    await getSavedSearches(req, res);

    assert.equal((res.body as { items: Array<{ id: string }> }).items[0].id, "search_1");
  } finally {
    prisma.savedSearch.findMany = originalFindMany;
  }
});

test("createSavedSearch stores current user search", async () => {
  const originalCreate = prisma.savedSearch.create;
  let receivedData: Record<string, unknown> | undefined;
  prisma.savedSearch.create = (async (input: { data: unknown }) => {
    receivedData = input.data as Record<string, unknown>;
    return {
      id: "search_1",
      ...(input.data as object),
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }) as unknown as typeof prisma.savedSearch.create;

  try {
    const req = {
      user: { id: "user_1" },
      body: {
        label: "Dogs in Boston",
        queryString: "category=dog&city=Boston"
      }
    } as unknown as Request;
    const res = createResponseMock();

    await createSavedSearch(req, res);

    assert.deepEqual(receivedData, {
      userId: "user_1",
      label: "Dogs in Boston",
      queryString: "category=dog&city=Boston"
    });
    assert.equal(res.statusCode, 201);
  } finally {
    prisma.savedSearch.create = originalCreate;
  }
});

test("deleteSavedSearch removes only the owner's saved search", async () => {
  const originalFindUnique = prisma.savedSearch.findUnique;
  const originalDelete = prisma.savedSearch.delete;
  let deletedId: string | undefined;
  prisma.savedSearch.findUnique = (async () => ({
    id: "search_1",
    userId: "user_1"
  })) as unknown as typeof prisma.savedSearch.findUnique;
  prisma.savedSearch.delete = (async (input: { where: { id: string } }) => {
    deletedId = input.where.id;
    return {
      id: input.where.id
    };
  }) as unknown as typeof prisma.savedSearch.delete;

  try {
    const req = {
      user: { id: "user_1" },
      params: { id: "search_1" }
    } as unknown as Request;
    const res = createResponseMock();

    await deleteSavedSearch(req, res);

    assert.equal(deletedId, "search_1");
    assert.equal(res.statusCode, 204);
  } finally {
    prisma.savedSearch.findUnique = originalFindUnique;
    prisma.savedSearch.delete = originalDelete;
  }
});
