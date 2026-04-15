import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import { writeRateLimiter } from "../../middleware/rate-limit.js";
import { petImagesUpload } from "../../middleware/upload.js";
import { validateBody, validateQuery } from "../../middleware/validate.js";
import { asyncHandler } from "../../utils/async-handler.js";
import {
  createListing,
  deleteListing,
  getListingById,
  getMyListings,
  getPublicListings,
  submitListing,
  updateListing
} from "./pets.controller.js";
import { deleteListingImage, uploadListingImages } from "./pets.images.controller.js";
import { listingPayloadSchema, listingQuerySchema, submissionSchema } from "./pets.schema.js";

export const petsRouter = Router();

petsRouter.get("/", validateQuery(listingQuerySchema), asyncHandler(getPublicListings));
petsRouter.get("/mine", requireAuth, asyncHandler(getMyListings));
petsRouter.get("/:id", asyncHandler(getListingById));
petsRouter.post("/", requireAuth, writeRateLimiter, validateBody(listingPayloadSchema), asyncHandler(createListing));
petsRouter.patch("/:id", requireAuth, writeRateLimiter, validateBody(listingPayloadSchema), asyncHandler(updateListing));
petsRouter.delete("/:id", requireAuth, asyncHandler(deleteListing));
petsRouter.post("/:id/images", requireAuth, writeRateLimiter, petImagesUpload, asyncHandler(uploadListingImages));
petsRouter.delete("/:id/images/:imageId", requireAuth, asyncHandler(deleteListingImage));
petsRouter.patch("/:id/status", requireAuth, validateBody(submissionSchema), asyncHandler(submitListing));
