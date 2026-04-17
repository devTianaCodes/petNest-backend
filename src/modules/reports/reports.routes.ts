import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import { writeRateLimiter } from "../../middleware/rate-limit.js";
import { validateBody } from "../../middleware/validate.js";
import { asyncHandler } from "../../utils/async-handler.js";
import { createListingReport } from "./reports.controller.js";
import { reportListingSchema } from "./reports.schema.js";

export const reportsRouter = Router();

reportsRouter.post(
  "/pets/:listingId",
  requireAuth,
  writeRateLimiter,
  validateBody(reportListingSchema),
  asyncHandler(createListingReport)
);
