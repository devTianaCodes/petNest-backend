import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import { asyncHandler } from "../../utils/async-handler.js";
import { addFavorite, getFavorites, removeFavorite } from "./favorites.controller.js";

export const favoritesRouter = Router();

favoritesRouter.get("/", requireAuth, asyncHandler(getFavorites));
favoritesRouter.post("/:listingId", requireAuth, asyncHandler(addFavorite));
favoritesRouter.delete("/:listingId", requireAuth, asyncHandler(removeFavorite));
