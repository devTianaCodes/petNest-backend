import assert from "node:assert/strict";
import crypto from "node:crypto";
import test from "node:test";
import { signAccessToken, signRefreshToken, verifyAccessToken, verifyRefreshToken } from "../src/utils/tokens.js";

test("access tokens preserve auth and profile fields", () => {
  const token = signAccessToken({
    id: "user_123",
    email: "petnest@example.com",
    role: "USER",
    status: "ACTIVE",
    isEmailVerified: true,
    fullName: "Pet Nest",
    phone: "1234567890",
    city: "Boston",
    state: "MA"
  });

  const payload = verifyAccessToken(token);

  assert.equal(payload.id, "user_123");
  assert.equal(payload.email, "petnest@example.com");
  assert.equal(payload.fullName, "Pet Nest");
  assert.equal(payload.city, "Boston");
  assert.equal(payload.state, "MA");
});

test("refresh tokens can be verified and hashed from the raw token", () => {
  const refreshToken = signRefreshToken("user_123");
  const payload = verifyRefreshToken(refreshToken.rawToken);
  const expectedHash = crypto.createHash("sha256").update(refreshToken.rawToken).digest("hex");

  assert.equal(payload.sub, "user_123");
  assert.ok(payload.jti);
  assert.equal(refreshToken.tokenHash.length, 64);
  assert.equal(refreshToken.tokenHash, expectedHash);
});

test("refresh tokens are unique for the same user", () => {
  const firstToken = signRefreshToken("user_123");
  const secondToken = signRefreshToken("user_123");

  assert.notEqual(firstToken.rawToken, secondToken.rawToken);
  assert.notEqual(firstToken.tokenHash, secondToken.tokenHash);
});
