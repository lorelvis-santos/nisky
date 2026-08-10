import type { NextFunction, Request, Response } from "express";

const WINDOW_MS = 60_000;
const MAX = Number(process.env.RATE_LIMIT_PER_MIN ?? 60);
const buckets = new Map<string, { count: number; resetAt: number }>();

function patKey(req: Request) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) return "anonymous";
  return header.slice("Bearer ".length).trim().slice(0, 10) || "anonymous";
}

export function rateLimit(req: Request, res: Response, next: NextFunction) {
  const key = patKey(req);
  const now = Date.now();
  let bucket = buckets.get(key);
  if (!bucket || bucket.resetAt < now) {
    bucket = { count: 0, resetAt: now + WINDOW_MS };
    buckets.set(key, bucket);
  }
  bucket.count += 1;
  if (bucket.count > MAX) {
    res
      .status(429)
      .header("Retry-After", String(Math.ceil((bucket.resetAt - now) / 1000)))
      .json({ ok: false, error: { code: "RATE_LIMITED", message: "Demasiadas solicitudes" } });
    return;
  }
  next();
}