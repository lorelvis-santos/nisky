import type { NextFunction, Request, Response } from "express";
import { AppError } from "../../utils/errors/handler";
import { pomodoroService } from "./pomodoro.service";
import type { SessionActionDto, SessionQueryDto, StartSessionDto, StatsQueryDto, UpdateSettingsDto } from "./pomodoro.validator";

type IdParams = { id: string };

function userId(req: Request) {
  if (!req.user) throw new AppError("UNAUTHORIZED");
  return req.user.id;
}

export class PomodoroController {
  getSettings = async (req: Request, res: Response, next: NextFunction) => { try { res.success(await pomodoroService.getSettings(userId(req))); } catch (error) { next(error); } };
  updateSettings = async (req: Request<{}, {}, UpdateSettingsDto>, res: Response, next: NextFunction) => { try { res.success(await pomodoroService.updateSettings(userId(req), req.body)); } catch (error) { next(error); } };
  list = async (req: Request, res: Response, next: NextFunction) => { try { res.success(await pomodoroService.list(userId(req), req.query as unknown as SessionQueryDto)); } catch (error) { next(error); } };
  start = async (req: Request<{}, {}, StartSessionDto>, res: Response, next: NextFunction) => { try { res.success(await pomodoroService.start(userId(req), req.body), 201); } catch (error) { next(error); } };
  getById = async (req: Request<IdParams>, res: Response, next: NextFunction) => { try { res.success(await pomodoroService.getById(userId(req), req.params.id)); } catch (error) { next(error); } };
  action = async (req: Request<IdParams, {}, SessionActionDto>, res: Response, next: NextFunction) => { try { res.success(await pomodoroService.action(userId(req), req.params.id, req.body)); } catch (error) { next(error); } };
  stats = async (req: Request, res: Response, next: NextFunction) => { try { res.success(await pomodoroService.stats(userId(req), req.query as unknown as StatsQueryDto)); } catch (error) { next(error); } };
}
