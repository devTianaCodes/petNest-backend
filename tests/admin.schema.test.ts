import assert from "node:assert/strict";
import test from "node:test";
import { rejectListingSchema, updateUserStatusSchema } from "../src/modules/admin/admin.schema.js";

test("reject listing schema requires a detailed reason", () => {
  const parsed = rejectListingSchema.safeParse({
    rejectionReason: "Photos need to be clearer and the rescue story needs more detail."
  });

  assert.equal(parsed.success, true);
  assert.equal(
    rejectListingSchema.safeParse({ rejectionReason: "too short" }).success,
    false
  );
});

test("user status schema only accepts ACTIVE or SUSPENDED", () => {
  assert.equal(updateUserStatusSchema.safeParse({ status: "ACTIVE" }).success, true);
  assert.equal(updateUserStatusSchema.safeParse({ status: "SUSPENDED" }).success, true);
  assert.equal(updateUserStatusSchema.safeParse({ status: "DISABLED" }).success, false);
});
