import { Router } from "express";
import { requireAuth, requireRole } from "../../middleware/auth.js";
import { validateBody } from "../../middleware/validate.js";
import { asyncHandler } from "../../utils/async-handler.js";
import {
  approveListing,
  getPendingListings,
  getUsers,
  rejectListing,
  suspendUser
} from "./admin.controller.js";
import { rejectListingSchema } from "./admin.schema.js";

export const adminRouter = Router();

adminRouter.use(requireAuth, requireRole("ADMIN"));
adminRouter.get("/pets/pending", asyncHandler(getPendingListings));
adminRouter.patch("/pets/:id/approve", asyncHandler(approveListing));
adminRouter.patch("/pets/:id/reject", validateBody(rejectListingSchema), asyncHandler(rejectListing));
adminRouter.get("/users", asyncHandler(getUsers));
adminRouter.patch("/users/:id/suspend", asyncHandler(suspendUser));
