import type { NextFunction, Request, Response } from "express";
import { AppError } from "../../utils/errors/handler";
import { commentService } from "./comments.service";
import type { CreateCommentDto, UpdateCommentDto } from "./comments.validator";

function userId(req: Request) {
  if (!req.user) throw new AppError("UNAUTHORIZED");
  return req.user.id;
}

type ProjectIdParams = { projectId: string };
type TaskIdParams = { taskId: string };
type CommentIdParams = { id: string };

export class CommentController {
  listProjectComments = async (req: Request<ProjectIdParams>, res: Response, next: NextFunction) => {
    try {
      res.success(await commentService.listProjectComments(userId(req), req.params.projectId, req.query));
    } catch (error) { next(error); }
  };

  createProjectComment = async (req: Request<ProjectIdParams, {}, CreateCommentDto>, res: Response, next: NextFunction) => {
    try {
      res.success(await commentService.createProjectComment(userId(req), req.params.projectId, req.body.body), 201);
    } catch (error) { next(error); }
  };

  listTaskComments = async (req: Request<TaskIdParams>, res: Response, next: NextFunction) => {
    try {
      res.success(await commentService.listTaskComments(userId(req), req.params.taskId, req.query));
    } catch (error) { next(error); }
  };

  createTaskComment = async (req: Request<TaskIdParams, {}, CreateCommentDto>, res: Response, next: NextFunction) => {
    try {
      res.success(await commentService.createTaskComment(userId(req), req.params.taskId, req.body.body), 201);
    } catch (error) { next(error); }
  };

  updateComment = async (req: Request<CommentIdParams, {}, UpdateCommentDto>, res: Response, next: NextFunction) => {
    try {
      if (req.body.body === undefined) throw new AppError("BAD_REQUEST", "El contenido es requerido");
      res.success(await commentService.updateComment(userId(req), req.params.id, req.body.body));
    } catch (error) { next(error); }
  };

  deleteComment = async (req: Request<CommentIdParams>, res: Response, next: NextFunction) => {
    try {
      res.success(await commentService.deleteComment(userId(req), req.params.id));
    } catch (error) { next(error); }
  };
}