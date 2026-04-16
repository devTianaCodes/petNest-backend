import type { Request, Response } from "express";
import { pinoHttp } from "pino-http";

export const logger = pinoHttp<Request, Response>({
  quietReqLogger: true,
  customLogLevel(_req: Request, res: Response, error?: Error) {
    if (error || res.statusCode >= 500) {
      return "error";
    }

    if (res.statusCode >= 400) {
      return "warn";
    }

    return "info";
  },
  customSuccessMessage(req: Request, res: Response) {
    return `${req.method} ${req.originalUrl} ${res.statusCode}`;
  },
  customErrorMessage(req: Request, res: Response, error: Error) {
    return `${req.method} ${req.originalUrl} ${res.statusCode} ${error.message}`;
  }
});
