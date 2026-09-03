import type { NextFunction, Request, Response } from "express";
import { AppError } from "../../utils/errors/handler";
import { taskScheduleService } from "./task-schedules.service";
import type { ReorderTaskSchedulesDto, TaskScheduleQueryDto, UpsertTaskScheduleDto } from "./task-schedules.validator";

type TaskIdParams = { taskId: string };

function userId(req: Request) {
  if (!req.user) throw new AppError("UNAUTHORIZED");
  return req.user.id;
}

export class TaskScheduleController {
  list = async (req: Request, res: Response, next: NextFunction) => {
    try { res.success(await taskScheduleService.list(userId(req), req.query as unknown as TaskScheduleQueryDto)); } catch (error) { next(error); }
  };

  upsert = async (req: Request<TaskIdParams, {}, UpsertTaskScheduleDto>, res: Response, next: NextFunction) => {
    try { res.success(await taskScheduleService.upsert(userId(req), req.params.taskId, req.body)); } catch (error) { next(error); }
  };

  remove = async (req: Request<TaskIdParams>, res: Response, next: NextFunction) => {
    try { res.success(await taskScheduleService.remove(userId(req), req.params.taskId)); } catch (error) { next(error); }
  };

  reorder = async (req: Request<{}, {}, ReorderTaskSchedulesDto>, res: Response, next: NextFunction) => {
    try { res.success(await taskScheduleService.reorder(userId(req), req.body)); } catch (error) { next(error); }
  };
}
