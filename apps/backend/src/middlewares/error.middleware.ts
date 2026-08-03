import type { Request, Response, NextFunction } from "express";
import { toAppError } from "../utils/errors/handler";

export function errorMiddleware(error: unknown, _req: Request, res: Response, _next: NextFunction) {
  const appError = toAppError(error);
  res.status(appError.http).json({
    ok: false,
    error: {
      code: appError.code,
      message: appError.message,
      ...(appError.details === undefined ? {} : { details: appError.details }),
    },
  });
}
