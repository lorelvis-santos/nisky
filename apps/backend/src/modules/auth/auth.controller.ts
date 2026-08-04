import type { NextFunction, Request, Response } from "express";
import { AppError } from "../../utils/errors/handler";
import { getPublicSignup } from "../../utils/settings/publicSignup";
import { authService } from "./auth.service";
import type { ChangePasswordDto, LoginDto, RegisterDto } from "./auth.validator";

const COOKIE_NAME = "refreshToken";
const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  // El proxy de Next.js necesita detectar la cookie también en la ruta `/`.
  path: "/",
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

function metadata(req: Request) {
  return { userAgent: req.get("user-agent"), ip: req.ip };
}

function setRefreshCookie(res: Response, value: string) {
  res.cookie(COOKIE_NAME, value, cookieOptions);
}

export class AuthController {
  login = async (req: Request<{}, {}, LoginDto>, res: Response, next: NextFunction) => {
    try {
      const result = await authService.login(req.body, metadata(req));
      setRefreshCookie(res, result.refreshToken);
      res.success({ accessToken: result.accessToken, user: result.user });
    } catch (error) {
      next(error);
    }
  };

  register = async (req: Request<{}, {}, RegisterDto>, res: Response, next: NextFunction) => {
    try {
      const publicSignup = await getPublicSignup();
      if (!publicSignup) throw new AppError("FORBIDDEN", "El registro público está deshabilitado");
      const result = await authService.register(req.body, metadata(req));
      setRefreshCookie(res, result.refreshToken);
      res.success({ accessToken: result.accessToken, user: result.user }, 201);
    } catch (error) {
      next(error);
    }
  };

  refresh = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await authService.refresh(req.cookies[COOKIE_NAME], metadata(req));
      setRefreshCookie(res, result.refreshToken);
      res.success({ accessToken: result.accessToken, user: result.user });
    } catch (error) {
      // An invalid refresh cookie must not make the proxy treat the client as authenticated.
      res.clearCookie(COOKIE_NAME, { path: cookieOptions.path });
      next(error);
    }
  };

  me = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) throw new AppError("UNAUTHORIZED");
      res.success(await authService.me(req.user.id));
    } catch (error) {
      next(error);
    }
  };

  logout = async (req: Request, res: Response, next: NextFunction) => {
    try {
      await authService.logout(req.cookies[COOKIE_NAME]);
      res.clearCookie(COOKIE_NAME, { path: cookieOptions.path });
      res.success({ success: true });
    } catch (error) {
      next(error);
    }
  };

  changePassword = async (req: Request<{}, {}, ChangePasswordDto>, res: Response, next: NextFunction) => {
    try {
      if (!req.user) throw new AppError("UNAUTHORIZED");
      await authService.changePassword(req.user.id, req.body.currentPassword, req.body.newPassword);
      res.success({ success: true });
    } catch (error) {
      next(error);
    }
  };

  config = async (_req: Request, res: Response, next: NextFunction) => {
    try { res.success({ publicSignup: await getPublicSignup() }); } catch (error) { next(error); }
  };
}
