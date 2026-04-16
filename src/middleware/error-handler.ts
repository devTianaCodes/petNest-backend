import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { AppError } from "../utils/http.js";

export function errorHandler(error: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (error instanceof ZodError) {
    _req.log?.warn({ issues: error.flatten() }, "validation failed");
    return res.status(400).json({
      message: "Validation failed",
      issues: error.flatten()
    });
  }

  if (error instanceof AppError) {
    _req.log?.warn({ statusCode: error.statusCode, message: error.message }, "application error");
    return res.status(error.statusCode).json({ message: error.message });
  }

  _req.log?.error({ err: error }, "unexpected error");

  return res.status(500).json({
    message: "Internal server error"
  });
}
