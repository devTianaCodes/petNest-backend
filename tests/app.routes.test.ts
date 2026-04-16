import assert from "node:assert/strict";
import test from "node:test";
import type { NextFunction, Request, Response } from "express";
import { me } from "../src/modules/auth/auth.controller.js";
import { registerSchema } from "../src/modules/auth/auth.schema.js";
import { updateUserStatusSchema } from "../src/modules/admin/admin.schema.js";
import { prisma } from "../src/lib/prisma.js";
import { requireAuth, requireRole } from "../src/middleware/auth.js";
import { validateBody } from "../src/middleware/validate.js";
import { signAccessToken } from "../src/utils/tokens.js";

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

function createNextMock() {
  let called = false;
  const next = (() => {
    called = true;
  }) as NextFunction;

  return {
    next,
    wasCalled: () => called
  };
}

test("register validation rejects invalid payloads", () => {
  const middleware = validateBody(registerSchema);
  const req = {
    body: {
      fullName: "P",
      email: "not-an-email",
      password: "short"
    }
  } as Request;

  assert.throws(() => middleware(req, {} as Response, (() => undefined) as NextFunction));
});

test("user status validation rejects unsupported values", () => {
  const middleware = validateBody(updateUserStatusSchema);
  const req = {
    body: { status: "DISABLED" }
  } as Request;

  assert.throws(() => middleware(req, {} as Response, (() => undefined) as NextFunction));
});

test("auth middleware rejects requests without a bearer token", async () => {
  const req = {
    headers: {}
  } as Request;
  const res = createResponseMock();
  const next = createNextMock();

  await requireAuth(req, res, next.next);

  assert.equal(res.statusCode, 401);
  assert.deepEqual(res.body, { message: "Authentication required" });
  assert.equal(next.wasCalled(), false);
});

test("auth middleware accepts active users with a valid token", async () => {
  const originalFindUnique = prisma.user.findUnique;
  prisma.user.findUnique = (async () => ({
    id: "user_1",
    email: "hello@petnest.app",
    role: "USER",
    status: "ACTIVE",
    isEmailVerified: true
  })) as unknown as typeof prisma.user.findUnique;

  try {
    const req = {
      headers: {
        authorization: `Bearer ${signAccessToken({
          id: "user_1",
          email: "hello@petnest.app",
          role: "USER",
          status: "ACTIVE",
          isEmailVerified: true
        })}`
      }
    } as Request;
    const res = createResponseMock();
    const next = createNextMock();

    await requireAuth(req, res, next.next);

    assert.equal(next.wasCalled(), true);
    assert.equal(req.user?.id, "user_1");
    assert.equal(res.statusCode, 200);
  } finally {
    prisma.user.findUnique = originalFindUnique;
  }
});

test("role guard rejects non-admin users", () => {
  const guard = requireRole("ADMIN");
  const req = {
    user: {
      id: "user_2",
      email: "user@petnest.app",
      role: "USER",
      status: "ACTIVE",
      isEmailVerified: true
    }
  } as Request;
  const res = createResponseMock();
  const next = createNextMock();

  guard(req, res, next.next);

  assert.equal(res.statusCode, 403);
  assert.deepEqual(res.body, { message: "Forbidden" });
  assert.equal(next.wasCalled(), false);
});

test("me controller returns the selected profile fields", async () => {
  const originalFindUnique = prisma.user.findUnique;
  prisma.user.findUnique = (async () => ({
    id: "user_1",
    fullName: "Pet Nest",
    email: "hello@petnest.app",
    phone: "1234567890",
    city: "Boston",
    state: "MA",
    role: "USER",
    status: "ACTIVE",
    isEmailVerified: true,
    createdAt: new Date("2024-01-01T00:00:00.000Z")
  })) as unknown as typeof prisma.user.findUnique;

  try {
    const req = {
      user: {
        id: "user_1",
        email: "hello@petnest.app",
        role: "USER",
        status: "ACTIVE",
        isEmailVerified: true
      }
    } as Request;
    const res = createResponseMock();

    await me(req, res);

    assert.equal(res.statusCode, 200);
    assert.equal((res.body as { user: { fullName: string } }).user.fullName, "Pet Nest");
    assert.equal((res.body as { user: { city: string } }).user.city, "Boston");
  } finally {
    prisma.user.findUnique = originalFindUnique;
  }
});
