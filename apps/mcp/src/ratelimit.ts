import { createHash } from "node:crypto";
import type { NextFunction, Request, Response } from "express";

const WINDOW_MS = 60_000;
const MAX = Math.max(1, Number.parseInt(process.env.RATE_LIMIT_PER_MIN ?? "60", 10) || 60);
const buckets = new Map<string, { count: number; resetAt: number }>();
let lastPrunedAt = 0;

function credentialKey(req: Request) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) return "anonymous";
  const token = header.slice("Bearer ".length).trim();
  if (!token) return "anonymous";
  return `credential:${createHash("sha256").update(token).digest("hex").slice(0, 16)}`;
}

function pruneExpired(now: number) {
  if (now - lastPrunedAt < WINDOW_MS) return;
  lastPrunedAt = now;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

export function rateLimit(req: Request, res: Response, next: NextFunction) {
  const key = credentialKey(req);
  const now = Date.now();
  pruneExpired(now);
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
