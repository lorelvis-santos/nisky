import type { NextFunction, Request, Response } from "express";
import { prisma } from "../infra/prisma/client";
import { clearUserPresence } from "../infra/redis/client";

const REFRESH_COOKIE = "refreshToken";

export async function clearPresenceOnLogout(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const raw = req.cookies[REFRESH_COOKIE] as string | undefined;
    if (raw) {
      const id = raw.split(".", 1)[0];
      if (id) {
        const token = await prisma.refreshToken.findUnique({ where: { id }, select: { userId: true } });
        if (token) {
          await clearUserPresence(token.userId);
        }
      }
    }
  } catch {
    /* best effort: si Redis falla, la presence expira sola por TTL */
  }
  next();
}