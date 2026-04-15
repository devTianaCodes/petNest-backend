import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import { validateBody } from "../../middleware/validate.js";
import { asyncHandler } from "../../utils/async-handler.js";
import { updateProfileSchema } from "./user.schema.js";
import { updateProfile } from "./users.controller.js";

export const usersRouter = Router();

usersRouter.patch("/me", requireAuth, validateBody(updateProfileSchema), asyncHandler(updateProfile));
