import type { NextFunction, Request, Response } from "express";
import { AppError } from "../../utils/errors/handler";
import { knowledgeService } from "./knowledge.service";
import type { CreateNoteDto, NoteQueryDto, SaveNoteDraftDto, UpdateNoteDto } from "./knowledge.validator";

type IdParams = { id: string };

function userId(req: Request) {
  if (!req.user) throw new AppError("UNAUTHORIZED");
  return req.user.id;
}

export class KnowledgeController {
  list = async (req: Request, res: Response, next: NextFunction) => {
    try { res.success(await knowledgeService.list(userId(req), req.query as unknown as NoteQueryDto)); } catch (error) { next(error); }
  };

  facets = async (req: Request, res: Response, next: NextFunction) => {
    try { res.success(await knowledgeService.facets(userId(req))); } catch (error) { next(error); }
  };

  getById = async (req: Request<IdParams>, res: Response, next: NextFunction) => {
    try { res.success(await knowledgeService.getById(userId(req), req.params.id)); } catch (error) { next(error); }
  };

  create = async (req: Request<{}, {}, CreateNoteDto>, res: Response, next: NextFunction) => {
    try { res.success(await knowledgeService.create(userId(req), req.body), 201); } catch (error) { next(error); }
  };

  update = async (req: Request<IdParams, {}, UpdateNoteDto>, res: Response, next: NextFunction) => {
    try { res.success(await knowledgeService.update(userId(req), req.params.id, req.body)); } catch (error) { next(error); }
  };

  delete = async (req: Request<IdParams>, res: Response, next: NextFunction) => {
    try { await knowledgeService.delete(userId(req), req.params.id); res.success({ success: true }); } catch (error) { next(error); }
  };

  getDraft = async (req: Request, res: Response, next: NextFunction) => {
    try { res.success(await knowledgeService.getDraft(userId(req))); } catch (error) { next(error); }
  };

  saveDraft = async (req: Request<{}, {}, SaveNoteDraftDto>, res: Response, next: NextFunction) => {
    try { res.success(await knowledgeService.saveDraft(userId(req), req.body)); } catch (error) { next(error); }
  };

  deleteDraft = async (req: Request, res: Response, next: NextFunction) => {
    try { res.success(await knowledgeService.deleteDraft(userId(req))); } catch (error) { next(error); }
  };
}
