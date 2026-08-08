import type { NextFunction, Request, Response } from "express";
import { AppError } from "../../utils/errors/handler";
import { notificationService } from "./notifications.service";
import type { UpdateNotificationSettingsDto } from "./notifications.validator";

function userId(req: Request) {
  if (!req.user) throw new AppError("UNAUTHORIZED");
  return req.user.id;
}

export class NotificationController {
  getSettings = async (req: Request, res: Response, next: NextFunction) => {
    try { res.success(await notificationService.getSettings(userId(req))); } catch (error) { next(error); }
  };

  updateSettings = async (req: Request<{}, {}, UpdateNotificationSettingsDto>, res: Response, next: NextFunction) => {
    try { res.success(await notificationService.updateSettings(userId(req), req.body)); } catch (error) { next(error); }
  };
}