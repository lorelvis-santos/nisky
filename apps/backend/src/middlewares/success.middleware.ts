import type { Request, Response, NextFunction } from "express";

declare module "express-serve-static-core" {
  interface Response {
    success(data?: unknown, status?: number): void;
  }
}

export function successMiddleware(_req: Request, res: Response, next: NextFunction) {
  res.success = (data, status = 200) => {
    res.status(status).json({ ok: true, ...(data === undefined ? {} : { data }) });
  };
  next();
}
