import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import { env } from "./config/env.js";
import { logger } from "./lib/logger.js";
import { errorHandler } from "./middleware/error-handler.js";
import { notFoundHandler } from "./middleware/not-found.js";
import { requireAuth } from "./middleware/auth.js";
import { adminRouter } from "./modules/admin/admin.routes.js";
import { adoptionRequestsRouter } from "./modules/adoption-requests/adoption-requests.routes.js";
import { authRouter } from "./modules/auth/auth.routes.js";
import { categoriesRouter } from "./modules/categories/categories.routes.js";
import { petsRouter } from "./modules/pets/pets.routes.js";
import { usersRouter } from "./modules/users/users.routes.js";

export const app = express();

app.use(logger);
app.use(
  cors({
    origin: env.CLIENT_URL,
    credentials: true
  })
);
app.use(helmet());
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", name: "petnest-backend" });
});

app.use("/api/auth", authRouter);
app.use("/api/users", usersRouter);
app.use("/api/categories", categoriesRouter);
app.use("/api/pets", petsRouter);
app.use("/api/adoption-requests", adoptionRequestsRouter);
app.use("/api/admin", adminRouter);

app.get("/api/me", requireAuth, (req, res) => {
  res.json({ user: req.user });
});

app.use(notFoundHandler);
app.use(errorHandler);
