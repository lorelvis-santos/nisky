import type { NextFunction, Request, Response } from "express";
import jwt, { type JwtPayload } from "jsonwebtoken";
import { AppError } from "../utils/errors/handler";

type UserRole = "ADMIN" | "USER";

declare global {
  namespace Express {
    interface Request {
      user?: { id: string; email: string; role: UserRole };
    }
  }
}

interface AccessPayload extends JwtPayload {
  sub: string;
  email: string;
  role: UserRole;
}

function decodeAccessToken(req: Request) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) throw new AppError("UNAUTHORIZED", "Acceso denegado");
  const token = header.slice("Bearer ".length).trim();
  const secret = process.env.JWT_ACCESS_SECRET;
  if (!secret) throw new AppError("INTERNAL", "JWT_ACCESS_SECRET no está configurado");

  const payload = jwt.verify(token, secret) as AccessPayload;
  if (!payload.sub || !payload.email || !["ADMIN", "USER"].includes(payload.role)) {
    throw new AppError("UNAUTHORIZED", "Token inválido");
  }
  return { id: payload.sub, email: payload.email, role: payload.role };
}

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  try {
    req.user = decodeAccessToken(req);
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
