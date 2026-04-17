import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import path from "node:path";
import { env } from "./config/env.js";
import { logger } from "./lib/logger.js";
import { errorHandler } from "./middleware/error-handler.js";
import { notFoundHandler } from "./middleware/not-found.js";
import { requireAuth } from "./middleware/auth.js";
import { adminRouter } from "./modules/admin/admin.routes.js";
import { adoptionRequestsRouter } from "./modules/adoption-requests/adoption-requests.routes.js";
import { authRouter } from "./modules/auth/auth.routes.js";
import { categoriesRouter } from "./modules/categories/categories.routes.js";
import { favoritesRouter } from "./modules/favorites/favorites.routes.js";
import { petsRouter } from "./modules/pets/pets.routes.js";
import { reportsRouter } from "./modules/reports/reports.routes.js";
import { savedSearchesRouter } from "./modules/saved-searches/saved-searches.routes.js";
import { usersRouter } from "./modules/users/users.routes.js";

export const app = express();

const allowedOrigins = new Set([
  env.CLIENT_URL,
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:5174",
  "http://127.0.0.1:5174"
]);

function isAllowedDevOrigin(origin: string) {
  return /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin);
}

app.use(logger);
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.has(origin) || isAllowedDevOrigin(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true
  })
);
app.use(helmet());
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use("/uploads", express.static(path.resolve(process.cwd(), "uploads")));

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", name: "petnest-backend" });
});

app.use("/api/auth", authRouter);
app.use("/api/users", usersRouter);
app.use("/api/categories", categoriesRouter);
app.use("/api/favorites", favoritesRouter);
app.use("/api/reports", reportsRouter);
app.use("/api/saved-searches", savedSearchesRouter);
app.use("/api/pets", petsRouter);
app.use("/api/adoption-requests", adoptionRequestsRouter);
app.use("/api/admin", adminRouter);

app.get("/api/me", requireAuth, (req, res) => {
  res.json({ user: req.user });
});

app.use(notFoundHandler);
app.use(errorHandler);
