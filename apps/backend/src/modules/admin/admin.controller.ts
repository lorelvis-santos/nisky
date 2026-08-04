import type { NextFunction, Request, Response } from "express";
import { AppError } from "../../utils/errors/handler";
import { adminService } from "./admin.service";
import type { AdminUsersQueryDto, CreateAdminUserDto, UpdateAdminUserDto, UpdateSettingsDto } from "./admin.validator";

type IdParams = { id: string };

function requesterId(req: Request) {
  if (!req.user) throw new AppError("UNAUTHORIZED");
  return req.user.id;
}

export class AdminController {
  listUsers = async (req: Request, res: Response, next: NextFunction) => {
    try { res.success(await adminService.listUsers(req.query as unknown as AdminUsersQueryDto)); } catch (error) { next(error); }
  };

  createUser = async (req: Request<{}, {}, CreateAdminUserDto>, res: Response, next: NextFunction) => {
    try { res.success(await adminService.createUser(req.body), 201); } catch (error) { next(error); }
  };

  updateUser = async (req: Request<IdParams, {}, UpdateAdminUserDto>, res: Response, next: NextFunction) => {
    try { res.success(await adminService.updateUser(req.params.id, req.body, requesterId(req))); } catch (error) { next(error); }
  };

  deleteUser = async (req: Request<IdParams>, res: Response, next: NextFunction) => {
    try { await adminService.deleteUser(req.params.id, requesterId(req)); res.success({ success: true }); } catch (error) { next(error); }
  };

  getSettings = async (_req: Request, res: Response, next: NextFunction) => {
    try { res.success(await adminService.getSettings()); } catch (error) { next(error); }
  };

  updateSettings = async (req: Request<{}, {}, UpdateSettingsDto>, res: Response, next: NextFunction) => {
    try { res.success(await adminService.updateSettings(req.body)); } catch (error) { next(error); }
  };
}