import { Router } from "express";
import { login, logout, me, refresh, register, verifyEmailHandler } from "./auth.controller.js";
import { loginSchema, registerSchema, verifyEmailSchema } from "./auth.schema.js";
import { requireAuth } from "../../middleware/auth.js";
import { authRateLimiter } from "../../middleware/rate-limit.js";
import { validateBody } from "../../middleware/validate.js";
import { asyncHandler } from "../../utils/async-handler.js";

export const authRouter = Router();

authRouter.post("/register", authRateLimiter, validateBody(registerSchema), asyncHandler(register));
authRouter.post("/login", authRateLimiter, validateBody(loginSchema), asyncHandler(login));
authRouter.post("/logout", asyncHandler(logout));
authRouter.post("/refresh", asyncHandler(refresh));
authRouter.get("/me", requireAuth, asyncHandler(me));
authRouter.post("/verify-email", authRateLimiter, validateBody(verifyEmailSchema), asyncHandler(verifyEmailHandler));
