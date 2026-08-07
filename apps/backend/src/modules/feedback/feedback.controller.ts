import type { NextFunction, Request, Response } from "express";
import { AppError } from "../../utils/errors/handler";
import { feedbackService } from "./feedback.service";
import type { CreateFeedbackDto, FeedbackQueryDto, UpdateFeedbackDto } from "./feedback.validator";

type IdParams = { id: string };

function userId(req: Request) {
  if (!req.user) throw new AppError("UNAUTHORIZED");
  return req.user.id;
}

export class FeedbackController {
  create = async (req: Request<{}, {}, CreateFeedbackDto>, res: Response, next: NextFunction) => {
    try { res.success(await feedbackService.create(userId(req), req.body), 201); } catch (error) { next(error); }
  };

  listMine = async (req: Request, res: Response, next: NextFunction) => {
    try { res.success(await feedbackService.listMine(userId(req))); } catch (error) { next(error); }
  };

  deleteMine = async (req: Request<IdParams>, res: Response, next: NextFunction) => {
    try { await feedbackService.deleteMine(userId(req), req.params.id); res.success({ success: true }); } catch (error) { next(error); }
  };

  adminList = async (req: Request, res: Response, next: NextFunction) => {
    try { res.success(await feedbackService.listAll(req.query as unknown as FeedbackQueryDto)); } catch (error) { next(error); }
  };

  adminUpdate = async (req: Request<IdParams, {}, UpdateFeedbackDto>, res: Response, next: NextFunction) => {
    try { res.success(await feedbackService.updateStatus(req.params.id, req.body)); } catch (error) { next(error); }
  };

  adminDelete = async (req: Request<IdParams>, res: Response, next: NextFunction) => {
    try { await feedbackService.deleteAny(req.params.id); res.success({ success: true }); } catch (error) { next(error); }
  };
}