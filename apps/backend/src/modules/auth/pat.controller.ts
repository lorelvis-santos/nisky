import type { NextFunction, Request, Response } from "express";
import { AppError } from "../../utils/errors/handler";
import { patService } from "./pat.service";
import type { CreatePatDto } from "./pat.validator";

type IdParams = { id: string };

function userId(req: Request) {
  if (!req.user) throw new AppError("UNAUTHORIZED");
  return req.user.id;
}

export class PatController {
  create = async (req: Request<{}, {}, CreatePatDto>, res: Response, next: NextFunction) => {
    try {
      const result = await patService.create(userId(req), req.body);
      res.success(result, 201);
    } catch (error) {
      next(error);
    }
  };

  list = async (req: Request, res: Response, next: NextFunction) => {
    try {
      res.success(await patService.list(userId(req)));
    } catch (error) {
      next(error);
    }
  };

  revoke = async (req: Request<IdParams>, res: Response, next: NextFunction) => {
    try {
      res.success(await patService.revoke(userId(req), req.params.id));
    } catch (error) {
      next(error);
    }
  };
}

export const patController = new PatController();