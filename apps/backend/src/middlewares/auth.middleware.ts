import type { NextFunction, Request, Response } from "express";
import jwt, { type JwtPayload } from "jsonwebtoken";
import { AppError } from "../utils/errors/handler";
import { patService } from "../modules/auth/pat.service";

type UserRole = "ADMIN" | "USER";

declare global {
  namespace Express {
    interface Request {
      user?: { id: string; email: string; role: UserRole };
      sessionId?: string;
    }
  }
}

interface AccessPayload extends JwtPayload {
  sub: string;
  email: string;
  role: UserRole;
}

async function decodeAccessToken(req: Request) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) throw new AppError("UNAUTHORIZED", "Acceso denegado");
  const token = header.slice("Bearer ".length).trim();

  if (token.startsWith("nisky_pat_")) {
    const user = await patService.verify(token);
    return { id: user.id, email: user.email, role: user.role };
  }

  const secret = process.env.JWT_ACCESS_SECRET;
  if (!secret) throw new AppError("INTERNAL", "JWT_ACCESS_SECRET no está configurado");

  const payload = jwt.verify(token, secret) as AccessPayload;
  if (!payload.sub || !payload.email || !["ADMIN", "USER"].includes(payload.role)) {
    throw new AppError("UNAUTHORIZED", "Token inválido");
  }
  return { id: payload.sub, email: payload.email, role: payload.role };
}

export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  try {
    req.user = await decodeAccessToken(req);
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      next(new AppError("UNAUTHORIZED", "Su sesión expiró"));
    } else if (error instanceof jwt.JsonWebTokenError) {
      next(new AppError("UNAUTHORIZED", "Token inválido"));
    } else {
      next(error);
    }
  }
}

export function requireAdmin(req: Request, _res: Response, next: NextFunction) {
  if (req.user?.role !== "ADMIN") {
    next(new AppError("FORBIDDEN", "Acceso restringido a administradores"));
    return;
  }
  next();
}

export function attachSessionId(req: Request, _res: Response, next: NextFunction) {
  const raw = req.cookies?.refreshToken as string | undefined;
  req.sessionId = raw?.split(".", 1)[0] || undefined;
  next();
}
