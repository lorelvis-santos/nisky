import type { NextFunction, Request, Response } from "express";
import jwt, { type JwtPayload } from "jsonwebtoken";
import { AppError } from "../utils/errors/handler";
import { patService } from "../modules/auth/pat.service";
import { OAuthError, oauthService } from "../modules/oauth/oauth.service";

type UserRole = "ADMIN" | "USER";

declare global {
  namespace Express {
    interface Request {
      user?: { id: string; email: string; role: UserRole };
      sessionId?: string;
      auth?: { type: "pat" | "jwt" | "oauth"; scopes: string[]; issuer?: string; audience?: string[]; resource?: string };
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
    return { user: { id: user.id, email: user.email, role: user.role }, auth: { type: "pat" as const, scopes: ["*"] } };
  }

  if (oauthService.isAccessToken(token)) {
    const result = await oauthService.verifyAccessToken(token);
    return { user: { id: result.user.id, email: result.user.email, role: result.user.role }, auth: { type: "oauth" as const, scopes: result.scopes, issuer: result.issuer, audience: result.audience, resource: result.resource } };
  }

  const secret = process.env.JWT_ACCESS_SECRET;
  if (!secret) throw new AppError("INTERNAL", "JWT_ACCESS_SECRET no está configurado");

  const payload = jwt.verify(token, secret) as AccessPayload;
  if (!payload.sub || !payload.email || !["ADMIN", "USER"].includes(payload.role)) {
    throw new AppError("UNAUTHORIZED", "Token inválido");
  }
  return { user: { id: payload.sub, email: payload.email, role: payload.role }, auth: { type: "jwt" as const, scopes: ["*"] } };
}

export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  try {
    const decoded = await decodeAccessToken(req);
    req.user = decoded.user;
    req.auth = decoded.auth;
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      next(new AppError("UNAUTHORIZED", "Su sesión expiró"));
    } else if (error instanceof jwt.JsonWebTokenError) {
      next(new AppError("UNAUTHORIZED", "Token inválido"));
    } else if (error instanceof OAuthError) {
      next(new AppError("UNAUTHORIZED", error.message));
    } else {
      next(error);
    }
  }
}

export async function requireJwtAuth(req: Request, _res: Response, next: NextFunction) {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) throw new AppError("UNAUTHORIZED", "Acceso denegado");
    const token = header.slice("Bearer ".length).trim();
    if (!token || token.startsWith("nisky_pat_") || oauthService.isAccessToken(token)) throw new AppError("UNAUTHORIZED", "Se requiere la sesión JWT web");
    const secret = process.env.JWT_ACCESS_SECRET;
    if (!secret) throw new AppError("INTERNAL", "JWT_ACCESS_SECRET no está configurado");
    const payload = jwt.verify(token, secret) as AccessPayload;
    if (!payload || typeof payload === "string" || !payload.sub || !payload.email || !["ADMIN", "USER"].includes(payload.role)) throw new AppError("UNAUTHORIZED", "Token inválido");
    req.user = { id: payload.sub, email: payload.email, role: payload.role };
    req.auth = { type: "jwt", scopes: ["*"] };
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) next(new AppError("UNAUTHORIZED", "Su sesión expiró"));
    else if (error instanceof jwt.JsonWebTokenError) next(new AppError("UNAUTHORIZED", "Token inválido"));
    else next(error);
  }
}

export function requireScopes(...requiredScopes: string[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.auth || !req.user) {
      next(new AppError("UNAUTHORIZED", "Acceso denegado"));
      return;
    }
    if (req.auth.scopes.includes("*") || requiredScopes.every((scope) => req.auth?.scopes.includes(scope))) {
      next();
      return;
    }
    next(new AppError("FORBIDDEN", "El token no tiene los scopes requeridos"));
  };
}

export const requireOAuthScopes = requireScopes;

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
