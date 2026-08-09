import type { NextFunction, Request, Response } from "express";
import { AppError } from "../../utils/errors/handler";
import { pushService } from "./push.service";
import { listNotificationLogs, recordNotificationLog } from "./notification-log.service";
import type { PushSubscribeErrorDto, PushSubscriptionDto, PushUnsubscribeDto } from "./push.validator";

function userId(req: Request) {
  if (!req.user) throw new AppError("UNAUTHORIZED");
  return req.user.id;
}

export class PushController {
  publicKey = (_req: Request, res: Response, next: NextFunction) => {
    try { res.success(pushService.getPublicKey()); } catch (error) { next(error); }
  };

  list = async (req: Request, res: Response, next: NextFunction) => {
    try { res.success(await pushService.list(userId(req))); } catch (error) { next(error); }
  };

  subscribe = async (req: Request<{}, {}, PushSubscriptionDto>, res: Response, next: NextFunction) => {
    try { await pushService.subscribe(userId(req), req.body); res.success({ subscribed: true }, 201); } catch (error) { next(error); }
  };

  unsubscribe = async (req: Request<{}, {}, PushUnsubscribeDto>, res: Response, next: NextFunction) => {
    try { await pushService.unsubscribe(userId(req), req.body); res.success({ unsubscribed: true }); } catch (error) { next(error); }
  };

  test = async (req: Request, res: Response, next: NextFunction) => {
    try { res.success(await pushService.sendTest(userId(req))); } catch (error) { next(error); }
  };

  logs = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const limit = Number(req.query.limit ?? 50);
      res.success(await listNotificationLogs(userId(req), Number.isFinite(limit) ? limit : 50));
    } catch (error) { next(error); }
  };

  subscribeError = async (req: Request<{}, {}, PushSubscribeErrorDto>, res: Response, next: NextFunction) => {
    try {
      const { name, message } = req.body;
      await recordNotificationLog({
        userId: userId(req),
        event: "subscribe_error",
        title: "Error al activar notificaciones",
        body: message ?? undefined,
        status: "failed",
        error: name ? `${name}: ${message ?? ""}` : (message ?? "Error desconocido"),
      });
      res.success({ recorded: true });
    } catch (error) { next(error); }
  };
}
