import type { NextFunction, Request, Response } from "express";
import { AppError } from "../../utils/errors/handler";
import { integrationService } from "./integration.service";
import { connectSchemaFor } from "./integration.validator";
import type { ConnectMoodleDto, IntegrationTaskQueryDto, ProviderParamDto } from "./integration.validator";

type IdParams = { id: string };
type IdWithProviderParams = IdParams & ProviderParamDto;

function userId(req: Request) {
  if (!req.user) throw new AppError("UNAUTHORIZED");
  return req.user.id;
}

export class IntegrationController {
  connect = async (req: Request<ProviderParamDto, {}, ConnectMoodleDto>, res: Response, next: NextFunction) => {
    try {
      const provider = req.params.provider;
      const schema = connectSchemaFor(provider);
      const parsed = schema.parse(req.body) as ConnectMoodleDto;
      res.success(await integrationService.connect(userId(req), provider, parsed), 201);
    } catch (error) {
      next(error);
    }
  };

  disconnect = async (req: Request<IdWithProviderParams>, res: Response, next: NextFunction) => {
    try { res.success(await integrationService.disconnect(userId(req), req.params.provider, req.params.id)); } catch (error) { next(error); }
  };

  clean = async (req: Request, res: Response, next: NextFunction) => {
    try { res.success(await integrationService.cleanTasks(userId(req), (req.query as unknown as IntegrationTaskQueryDto).source)); } catch (error) { next(error); }
  };

  list = async (req: Request, res: Response, next: NextFunction) => {
    try { res.success(await integrationService.list(userId(req))); } catch (error) { next(error); }
  };

  setEnabled = async (req: Request<IdWithProviderParams, {}, { enabled: boolean }>, res: Response, next: NextFunction) => {
    try { res.success(await integrationService.setEnabled(userId(req), req.params.provider, req.params.id, req.body.enabled)); } catch (error) { next(error); }
  };

  tasks = async (req: Request, res: Response, next: NextFunction) => {
    try { res.success(await integrationService.getTasks(userId(req), req.query as unknown as IntegrationTaskQueryDto)); } catch (error) { next(error); }
  };

  sync = async (req: Request<IdWithProviderParams>, res: Response, next: NextFunction) => {
    try { res.success(await integrationService.sync(userId(req), req.params.provider, req.params.id)); } catch (error) { next(error); }
  };
}