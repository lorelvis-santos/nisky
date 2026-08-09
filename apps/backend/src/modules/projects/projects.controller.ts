import type { NextFunction, Request, Response } from "express";
import { AppError } from "../../utils/errors/handler";
import { projectService } from "./projects.service";
import type { CreateProjectDto, UpdateProjectDto } from "./projects.validator";

type IdParams = { id: string };

function userId(req: Request) {
  if (!req.user) throw new AppError("UNAUTHORIZED");
  return req.user.id;
}

export class ProjectController {
  list = async (req: Request, res: Response, next: NextFunction) => {
    try { res.success(await projectService.list(userId(req))); } catch (error) { next(error); }
  };

  create = async (req: Request<{}, {}, CreateProjectDto>, res: Response, next: NextFunction) => {
    try { res.success(await projectService.create(userId(req), req.body), 201); } catch (error) { next(error); }
  };

  update = async (req: Request<IdParams, {}, UpdateProjectDto>, res: Response, next: NextFunction) => {
    try { res.success(await projectService.update(userId(req), req.params.id, req.body)); } catch (error) { next(error); }
  };

  setDefault = async (req: Request<IdParams>, res: Response, next: NextFunction) => {
    try { res.success(await projectService.setDefault(userId(req), req.params.id)); } catch (error) { next(error); }
  };

  delete = async (req: Request<IdParams>, res: Response, next: NextFunction) => {
    try { res.success(await projectService.delete(userId(req), req.params.id)); } catch (error) { next(error); }
  };
}
