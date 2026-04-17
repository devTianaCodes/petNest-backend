import { Router } from "express";
import { requireAuth, requireRole } from "../../middleware/auth.js";
import { validateBody } from "../../middleware/validate.js";
import { asyncHandler } from "../../utils/async-handler.js";
import {
  approveListing,
  getPendingListings,
  getReports,
  getUsers,
  rejectListing,
  updateReportStatus,
  updateUserStatus
} from "./admin.controller.js";
import { rejectListingSchema, updateReportStatusSchema, updateUserStatusSchema } from "./admin.schema.js";

export const adminRouter = Router();

adminRouter.use(requireAuth, requireRole("ADMIN"));
adminRouter.get("/pets/pending", asyncHandler(getPendingListings));
adminRouter.patch("/pets/:id/approve", asyncHandler(approveListing));
adminRouter.patch("/pets/:id/reject", validateBody(rejectListingSchema), asyncHandler(rejectListing));
adminRouter.get("/reports", asyncHandler(getReports));
adminRouter.patch("/reports/:id/status", validateBody(updateReportStatusSchema), asyncHandler(updateReportStatus));
adminRouter.get("/users", asyncHandler(getUsers));
adminRouter.patch("/users/:id/status", validateBody(updateUserStatusSchema), asyncHandler(updateUserStatus));
