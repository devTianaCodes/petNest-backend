import assert from "node:assert/strict";
import test from "node:test";
import type { Request, Response } from "express";
import { prisma } from "../src/lib/prisma.js";
import { validateBody } from "../src/middleware/validate.js";
import { updateProfile } from "../src/modules/users/users.controller.js";
import { updateProfileSchema } from "../src/modules/users/user.schema.js";

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

test("profile validation rejects short optional fields", () => {
  const middleware = validateBody(updateProfileSchema);
  const req = {
    body: {
      fullName: "A",
      phone: "123",
      city: "B",
      state: "C"
    }
  } as Request;

  assert.throws(() => middleware(req, {} as Response, (() => undefined) as never));
});

test("update profile normalizes blank optional fields to null", async () => {
  const originalUpdate = prisma.user.update;
  let receivedData: Record<string, unknown> | undefined;

  prisma.user.update = (async (input: { data: unknown }) => {
    receivedData = input.data as Record<string, unknown>;
    return {
      id: "user_1",
      fullName: "Jamie Foster",
      email: "jamie@petnest.app",
      phone: null,
      city: null,
      state: null,
      role: "USER",
      isEmailVerified: true
    };
  }) as unknown as typeof prisma.user.update;

  try {
    const req = {
      user: { id: "user_1" },
      body: {
        fullName: "Jamie Foster",
        phone: "",
        city: "",
        state: ""
      }
    } as Request;
    const res = createResponseMock();

    await updateProfile(req, res);

    assert.deepEqual(receivedData, {
      fullName: "Jamie Foster",
      phone: null,
      city: null,
      state: null
    });
    assert.equal(res.statusCode, 200);
    assert.equal((res.body as { user: { phone: null } }).user.phone, null);
  } finally {
    prisma.user.update = originalUpdate;
  }
});
