import type { NextFunction, Request, Response } from "express";
import { AppError } from "../../utils/errors/handler";
import { reminderService } from "./reminders.service";
import type { CreateReminderDto, ReminderQueryDto, SnoozeReminderDto, UpdateReminderDto } from "./reminders.validator";

type IdParams = { id: string };

function userId(req: Request) {
  if (!req.user) throw new AppError("UNAUTHORIZED");
  return req.user.id;
}

export class ReminderController {
  list = async (req: Request, res: Response, next: NextFunction) => {
    try { res.success(await reminderService.list(userId(req), req.query as unknown as ReminderQueryDto)); } catch (error) { next(error); }
  };

  get = async (req: Request<IdParams>, res: Response, next: NextFunction) => {
    try { res.success(await reminderService.getById(userId(req), req.params.id)); } catch (error) { next(error); }
  };

  create = async (req: Request<{}, {}, CreateReminderDto>, res: Response, next: NextFunction) => {
    try { res.success(await reminderService.create(userId(req), req.body), 201); } catch (error) { next(error); }
  };

  update = async (req: Request<IdParams, {}, UpdateReminderDto>, res: Response, next: NextFunction) => {
    try { res.success(await reminderService.update(userId(req), req.params.id, req.body)); } catch (error) { next(error); }
  };

  delete = async (req: Request<IdParams>, res: Response, next: NextFunction) => {
    try { await reminderService.delete(userId(req), req.params.id); res.success({ success: true }); } catch (error) { next(error); }
  };

  snooze = async (req: Request<IdParams, {}, SnoozeReminderDto>, res: Response, next: NextFunction) => {
    try { res.success(await reminderService.snooze(userId(req), req.params.id, req.body)); } catch (error) { next(error); }
  };
}
