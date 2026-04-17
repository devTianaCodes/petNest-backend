import assert from "node:assert/strict";
import test from "node:test";
import type { Request, Response } from "express";
import { prisma } from "../src/lib/prisma.js";
import { getUsers } from "../src/modules/admin/admin.controller.js";

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
    }
  } as Response & { statusCode: number; body: unknown };
}

test("getUsers returns moderation context including location", async () => {
  const originalFindMany = prisma.user.findMany;
  prisma.user.findMany = (async () => [
    {
      id: "user_1",
      fullName: "Jamie Foster",
      email: "jamie@petnest.app",
      city: "Boston",
      state: "MA",
      role: "USER",
      status: "ACTIVE",
      isEmailVerified: true,
      createdAt: new Date("2024-01-01T00:00:00.000Z")
    }
  ]) as unknown as typeof prisma.user.findMany;

  try {
    const res = createResponseMock();
    await getUsers({} as Request, res);

    assert.equal(res.statusCode, 200);
    const user = (res.body as { users: Array<{ city: string; state: string }> }).users[0];
    assert.equal(user.city, "Boston");
    assert.equal(user.state, "MA");
  } finally {
    prisma.user.findMany = originalFindMany;
  }
});
