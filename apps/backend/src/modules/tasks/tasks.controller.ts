import type { NextFunction, Request, Response } from "express";
import { AppError } from "../../utils/errors/handler";
import { taskService } from "./tasks.service";
import type { CreateSubtaskDto, CreateTaskDto, TaskQueryDto, UpdateSubtaskDto, UpdateTaskDto } from "./tasks.validator";

type IdParams = { id: string };
type SubtaskParams = { id: string; subtaskId: string };

function userId(req: Request) {
  if (!req.user) throw new AppError("UNAUTHORIZED");
  return req.user.id;
}

export class TaskController {
  list = async (req: Request, res: Response, next: NextFunction) => {
    try { res.success(await taskService.list(userId(req), req.query as unknown as TaskQueryDto)); } catch (error) { next(error); }
  };

  create = async (req: Request<{}, {}, CreateTaskDto>, res: Response, next: NextFunction) => {
    try { res.success(await taskService.create(userId(req), req.body), 201); } catch (error) { next(error); }
  };

  getById = async (req: Request<IdParams>, res: Response, next: NextFunction) => {
    try { res.success(await taskService.getById(userId(req), req.params.id)); } catch (error) { next(error); }
  };

  update = async (req: Request<IdParams, {}, UpdateTaskDto>, res: Response, next: NextFunction) => {
    try { res.success(await taskService.update(userId(req), req.params.id, req.body)); } catch (error) { next(error); }
  };

  delete = async (req: Request<IdParams>, res: Response, next: NextFunction) => {
    try { await taskService.delete(userId(req), req.params.id); res.success({ success: true }); } catch (error) { next(error); }
  };

  listSubtasks = async (req: Request<IdParams>, res: Response, next: NextFunction) => {
    try { res.success(await taskService.listSubtasks(userId(req), req.params.id)); } catch (error) { next(error); }
  };

  createSubtask = async (req: Request<IdParams, {}, CreateSubtaskDto>, res: Response, next: NextFunction) => {
    try { res.success(await taskService.createSubtask(userId(req), req.params.id, req.body), 201); } catch (error) { next(error); }
  };

  updateSubtask = async (req: Request<SubtaskParams, {}, UpdateSubtaskDto>, res: Response, next: NextFunction) => {
    try { res.success(await taskService.updateSubtask(userId(req), req.params.id, req.params.subtaskId, req.body)); } catch (error) { next(error); }
  };

  deleteSubtask = async (req: Request<SubtaskParams>, res: Response, next: NextFunction) => {
    try { await taskService.deleteSubtask(userId(req), req.params.id, req.params.subtaskId); res.success({ success: true }); } catch (error) { next(error); }
  };
}
