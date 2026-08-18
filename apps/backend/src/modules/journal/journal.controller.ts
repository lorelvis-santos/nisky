import type { NextFunction, Request, Response } from "express";
import { AppError } from "../../utils/errors/handler";
import { journalService } from "./journal.service";
import type { CreateJournalEntryDto, JournalQueryDto, SaveJournalDraftDto, UpdateJournalEntryDto } from "./journal.validator";

type IdParams = { id: string };

function userId(req: Request) {
  if (!req.user) throw new AppError("UNAUTHORIZED");
  return req.user.id;
}

function sessionId(req: Request) {
  return req.sessionId;
}

export class JournalController {
  list = async (req: Request, res: Response, next: NextFunction) => {
    try { res.success(await journalService.list(userId(req), sessionId(req), req.query as unknown as JournalQueryDto)); } catch (error) { next(error); }
  };

  getById = async (req: Request<IdParams>, res: Response, next: NextFunction) => {
    try { res.success(await journalService.getById(userId(req), sessionId(req), req.params.id)); } catch (error) { next(error); }
  };

  create = async (req: Request<{}, {}, CreateJournalEntryDto>, res: Response, next: NextFunction) => {
    try { res.success(await journalService.create(userId(req), sessionId(req), req.body), 201); } catch (error) { next(error); }
  };

  update = async (req: Request<IdParams, {}, UpdateJournalEntryDto>, res: Response, next: NextFunction) => {
    try { res.success(await journalService.update(userId(req), sessionId(req), req.params.id, req.body)); } catch (error) { next(error); }
  };

  delete = async (req: Request<IdParams>, res: Response, next: NextFunction) => {
    try { await journalService.delete(userId(req), sessionId(req), req.params.id); res.success({ success: true }); } catch (error) { next(error); }
  };

  getDraft = async (req: Request, res: Response, next: NextFunction) => {
    try { res.success(await journalService.getDraft(userId(req), sessionId(req))); } catch (error) { next(error); }
  };

  saveDraft = async (req: Request<{}, {}, SaveJournalDraftDto>, res: Response, next: NextFunction) => {
    try { res.success(await journalService.saveDraft(userId(req), sessionId(req), req.body)); } catch (error) { next(error); }
  };

  deleteDraft = async (req: Request, res: Response, next: NextFunction) => {
    try { res.success(await journalService.deleteDraft(userId(req), sessionId(req))); } catch (error) { next(error); }
  };
}
