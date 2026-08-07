import type { NextFunction, Request, Response } from "express";
import { AppError } from "../../utils/errors/handler";
import { moodleService } from "./moodle.service";
import type { ConnectMoodleDto, MoodleTaskQueryDto } from "./moodle.validator";

type IdParams = { id: string };

function userId(req: Request) {
  if (!req.user) throw new AppError("UNAUTHORIZED");
  return req.user.id;
}

export class MoodleController {
  connect = async (req: Request<{}, {}, ConnectMoodleDto>, res: Response, next: NextFunction) => {
    try { res.success(await moodleService.connect(userId(req), req.body), 201); } catch (error) { next(error); }
  };

  disconnect = async (req: Request<IdParams>, res: Response, next: NextFunction) => {
    try { res.success(await moodleService.disconnect(userId(req), req.params.id)); } catch (error) { next(error); }
  };

  clean = async (req: Request, res: Response, next: NextFunction) => {
    try { res.success(await moodleService.cleanIntegrationTasks(userId(req))); } catch (error) { next(error); }
  };

  list = async (req: Request, res: Response, next: NextFunction) => {
    try { res.success(await moodleService.list(userId(req))); } catch (error) { next(error); }
  };

  setEnabled = async (req: Request<IdParams, {}, { enabled: boolean }>, res: Response, next: NextFunction) => {
    try { res.success(await moodleService.setEnabled(userId(req), req.params.id, req.body.enabled)); } catch (error) { next(error); }
  };

  tasks = async (req: Request, res: Response, next: NextFunction) => {
    try { res.success(await moodleService.getTasks(userId(req), req.query as unknown as MoodleTaskQueryDto)); } catch (error) { next(error); }
  };

  sync = async (req: Request<IdParams>, res: Response, next: NextFunction) => {
    try { res.success(await moodleService.sync(userId(req), req.params.id)); } catch (error) { next(error); }
  };
}
