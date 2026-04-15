import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import { validateBody } from "../../middleware/validate.js";
import { asyncHandler } from "../../utils/async-handler.js";
import {
  createAdoptionRequest,
  getIncomingRequests,
  getOutgoingRequests,
  updateAdoptionRequestStatus
} from "./adoption-requests.controller.js";
import {
  createAdoptionRequestSchema,
  updateAdoptionRequestStatusSchema
} from "./adoption-requests.schema.js";

export const adoptionRequestsRouter = Router();

adoptionRequestsRouter.get("/incoming", requireAuth, asyncHandler(getIncomingRequests));
adoptionRequestsRouter.get("/outgoing", requireAuth, asyncHandler(getOutgoingRequests));
adoptionRequestsRouter.post("/pets/:id", requireAuth, validateBody(createAdoptionRequestSchema), asyncHandler(createAdoptionRequest));
adoptionRequestsRouter.patch("/:id/status", requireAuth, validateBody(updateAdoptionRequestStatusSchema), asyncHandler(updateAdoptionRequestStatus));
