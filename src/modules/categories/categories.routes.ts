import { Router } from "express";
import { getCategories } from "./categories.controller.js";
import { asyncHandler } from "../../utils/async-handler.js";

export const categoriesRouter = Router();

categoriesRouter.get("/", asyncHandler(getCategories));
