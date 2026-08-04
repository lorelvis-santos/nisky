import type { NextFunction, Request, Response } from "express";
import { AppError } from "../../utils/errors/handler";
import { quickNoteService } from "./quicknotes.service";
import type { CreateQuickNoteDto, QuickNoteQueryDto, UpdateQuickNoteDto } from "./quicknotes.validator";

type IdParams = { id: string };

function userId(req: Request) {
  if (!req.user) throw new AppError("UNAUTHORIZED");
  return req.user.id;
}

export class QuickNoteController {
  list = async (req: Request, res: Response, next: NextFunction) => {
    try { res.success(await quickNoteService.list(userId(req), req.query as unknown as QuickNoteQueryDto)); } catch (error) { next(error); }
  };

  create = async (req: Request<{}, {}, CreateQuickNoteDto>, res: Response, next: NextFunction) => {
    try { res.success(await quickNoteService.create(userId(req), req.body), 201); } catch (error) { next(error); }
  };

  update = async (req: Request<IdParams, {}, UpdateQuickNoteDto>, res: Response, next: NextFunction) => {
    try { res.success(await quickNoteService.update(userId(req), req.params.id, req.body)); } catch (error) { next(error); }
  };

  delete = async (req: Request<IdParams>, res: Response, next: NextFunction) => {
    try { await quickNoteService.delete(userId(req), req.params.id); res.success({ success: true }); } catch (error) { next(error); }
  };
}
