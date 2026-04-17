import assert from "node:assert/strict";
import test from "node:test";
import { isCloudinaryConfigured } from "../src/lib/image-storage.js";

test("image storage falls back to local disk when cloudinary env is blank", () => {
  assert.equal(isCloudinaryConfigured(), false);
});
