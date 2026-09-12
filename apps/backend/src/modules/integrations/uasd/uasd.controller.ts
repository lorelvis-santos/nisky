import type { NextFunction, Request, Response } from "express";
import { AppError } from "../../../utils/errors/handler";
import { uasdIntegrationService } from "./uasd.service";
import type { ConnectUasdDto } from "../integration.validator";

function userId(req: Request): string {
  if (!req.user) throw new AppError("UNAUTHORIZED");
  return req.user.id;
}

export class UasdController {
  connect = async (req: Request<{}, {}, ConnectUasdDto>, res: Response, next: NextFunction) => {
    try {
      res.success(await uasdIntegrationService.connect(userId(req), req.body));
    } catch (error) {
      next(error);
    }
  };

  sync = async (req: Request<{ id: string }>, res: Response, next: NextFunction) => {
    try {
      res.success(await uasdIntegrationService.enqueue(userId(req), req.params.id), 202);
    } catch (error) {
      next(error);
    }
  };

  status = async (req: Request<{ id: string }>, res: Response, next: NextFunction) => {
    try {
      res.success(await uasdIntegrationService.getJob(userId(req), req.params.id));
    } catch (error) {
      next(error);
    }
  };

  setEnabled = async (req: Request<{ id: string }, {}, { enabled: boolean }>, res: Response, next: NextFunction) => {
    try {
      res.success(await uasdIntegrationService.setEnabled(userId(req), req.params.id, req.body.enabled));
    } catch (error) {
      next(error);
    }
  };

  disconnect = async (req: Request<{ id: string }>, res: Response, next: NextFunction) => {
    try {
      res.success(await uasdIntegrationService.disconnect(userId(req), req.params.id));
    } catch (error) {
      next(error);
    }
  };
}
