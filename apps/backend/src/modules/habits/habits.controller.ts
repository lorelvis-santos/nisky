import type { NextFunction, Request, Response } from "express";
import { AppError } from "../../utils/errors/handler";
import { habitService } from "./habits.service";
import type { CreateHabitDto, EntriesQueryDto, HabitQueryDto, ToggleEntryDto, UpdateHabitDto } from "./habits.validator";

type IdParams = { id: string };

function userId(req: Request) {
  if (!req.user) throw new AppError("UNAUTHORIZED");
  return req.user.id;
}

export class HabitController {
  list = async (req: Request, res: Response, next: NextFunction) => {
    try { res.success(await habitService.list(userId(req), (req.query as unknown as HabitQueryDto).includeArchived)); } catch (error) { next(error); }
  };

  create = async (req: Request<{}, {}, CreateHabitDto>, res: Response, next: NextFunction) => {
    try { res.success(await habitService.create(userId(req), req.body), 201); } catch (error) { next(error); }
  };

  getById = async (req: Request<IdParams>, res: Response, next: NextFunction) => {
    try { res.success(await habitService.getById(userId(req), req.params.id)); } catch (error) { next(error); }
  };

  update = async (req: Request<IdParams, {}, UpdateHabitDto>, res: Response, next: NextFunction) => {
    try { res.success(await habitService.update(userId(req), req.params.id, req.body)); } catch (error) { next(error); }
  };

  delete = async (req: Request<IdParams>, res: Response, next: NextFunction) => {
    try { await habitService.delete(userId(req), req.params.id); res.success({ success: true }); } catch (error) { next(error); }
  };

  toggleEntry = async (req: Request<IdParams, {}, ToggleEntryDto>, res: Response, next: NextFunction) => {
    try { res.success(await habitService.toggleEntry(userId(req), req.params.id, req.body)); } catch (error) { next(error); }
  };

  entries = async (req: Request<IdParams>, res: Response, next: NextFunction) => {
    try { res.success(await habitService.entries(userId(req), req.params.id, req.query as unknown as EntriesQueryDto)); } catch (error) { next(error); }
  };

  streak = async (req: Request<IdParams>, res: Response, next: NextFunction) => {
    try { res.success({ streak: await habitService.streak(userId(req), req.params.id) }); } catch (error) { next(error); }
  };
}
