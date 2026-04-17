import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import { validateBody } from "../../middleware/validate.js";
import { asyncHandler } from "../../utils/async-handler.js";
import {
  createSavedSearch,
  deleteSavedSearch,
  getSavedSearches
} from "./saved-searches.controller.js";
import { savedSearchPayloadSchema } from "./saved-searches.schema.js";

export const savedSearchesRouter = Router();

savedSearchesRouter.use(requireAuth);
savedSearchesRouter.get("/", asyncHandler(getSavedSearches));
savedSearchesRouter.post("/", validateBody(savedSearchPayloadSchema), asyncHandler(createSavedSearch));
savedSearchesRouter.delete("/:id", asyncHandler(deleteSavedSearch));
