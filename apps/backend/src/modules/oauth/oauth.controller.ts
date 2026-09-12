import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { toAppError } from "../../utils/errors/handler";
import { oauthMetadata } from "./oauth.config";
import { OAuthError, oauthService } from "./oauth.service";
import type { AuthorizeDecision, AuthorizeRequest, RegistrationRequest, RevocationRequest, TokenRequest } from "./oauth.validator";

function noStore(res: Response) {
  res.set("Cache-Control", "no-store");
  res.set("Pragma", "no-cache");
}

export function sendOAuthError(res: Response, error: unknown) {
  noStore(res);
  if (error instanceof OAuthError) {
    res.status(error.status).json({ error: error.error, error_description: error.message });
    return;
  }
  if (error instanceof ZodError) {
    res.status(400).json({ error: "invalid_request", error_description: error.issues.map((issue) => issue.message).join("; ") });
    return;
  }
  const appError = toAppError(error);
  const status = appError.http;
  res.status(status).json({ error: status >= 500 ? "server_error" : status === 401 ? "invalid_token" : "invalid_request", error_description: appError.message });
}

export function oauthErrorMiddleware(error: unknown, _req: Request, res: Response, _next: NextFunction) {
  sendOAuthError(res, error);
}

export class OAuthController {
  metadata = (_req: Request, res: Response) => {
    noStore(res);
    res.json(oauthMetadata());
  };

  authorize = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) throw new OAuthError("access_denied", "Sesión requerida", 401);
      res.json(await oauthService.consent(req.query as unknown as AuthorizeRequest, req.user));
    } catch (error) {
      next(error);
    }
  };

  decision = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) throw new OAuthError("access_denied", "Sesión requerida", 401);
      noStore(res);
      res.json(await oauthService.decide(req.body as AuthorizeDecision, req.user.id, (req.body as AuthorizeDecision).decision));
    } catch (error) {
      next(error);
    }
  };

  token = async (req: Request, res: Response, next: NextFunction) => {
    try {
      noStore(res);
      res.json(await oauthService.token(req.body as TokenRequest));
    } catch (error) {
      next(error);
    }
  };

  register = async (req: Request, res: Response, next: NextFunction) => {
    try {
      noStore(res);
      res.status(201).json(await oauthService.registration(req.body as RegistrationRequest));
    } catch (error) {
      next(error);
    }
  };

  revoke = async (req: Request, res: Response, next: NextFunction) => {
    try {
      noStore(res);
      res.json(await oauthService.revoke(req.body as RevocationRequest));
    } catch (error) {
      next(error);
    }
  };

  introspect = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user || !req.auth) {
        res.json({ active: false });
        return;
      }
      noStore(res);
      res.json({
        active: true,
        sub: req.user.id,
        scope: req.auth.scopes.join(" "),
        token_type: "Bearer",
        issuer: req.auth.issuer,
        audience: req.auth.audience,
        resource: req.auth.resource,
      });
    } catch (error) {
      next(error);
    }
  };
}
