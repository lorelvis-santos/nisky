import type { NextFunction, Request, Response } from "express";
import { AppError } from "../../utils/errors/handler";
import { homeService } from "./home.service";

function userId(req: Request) {
  if (!req.user) throw new AppError("UNAUTHORIZED");
  return req.user.id;
}

export class HomeController {
  overview = async (req: Request, res: Response, next: NextFunction) => {
    try {
      res.success(await homeService.overview(userId(req)));
    } catch (error) {
      next(error);
    }
  };

  activity = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const weeks = Number(req.query.weeks ?? 12);
      res.success(await homeService.activity(userId(req), Number.isFinite(weeks) ? weeks : 12));
    } catch (error) {
      next(error);
    }
  };

  habitsMatrix = async (req: Request, res: Response, next: NextFunction) => {
    try {
      res.success(await homeService.habitsMatrix(userId(req)));
    } catch (error) {
      next(error);
    }
  };
}
