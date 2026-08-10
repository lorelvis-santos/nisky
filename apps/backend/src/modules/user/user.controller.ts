import type { NextFunction, Request, Response } from "express";
import { AppError } from "../../utils/errors/handler";
import { userService } from "./user.service";
import type { UpdateProfileDto } from "./user.validator";

function userId(req: Request) {
  if (!req.user) throw new AppError("UNAUTHORIZED");
  return req.user.id;
}

export class UserController {
  updateProfile = async (req: Request<{}, {}, UpdateProfileDto>, res: Response, next: NextFunction) => {
    try { res.success(await userService.updateProfile(userId(req), req.body)); } catch (error) { next(error); }
  };
  uploadAvatar = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.file) throw new AppError("BAD_REQUEST", "No se proporcionó ninguna imagen");
      res.success(await userService.uploadAvatar(userId(req), req.file));
    } catch (error) { next(error); }
  };
  removeAvatar = async (req: Request, res: Response, next: NextFunction) => {
    try { res.success(await userService.removeAvatar(userId(req))); } catch (error) { next(error); }
  };
}