import type { NextFunction, Request, Response } from "express";
import { AppError } from "../../utils/errors/handler";
import { StorageFactory } from "../storage/storage.factory";

export class UploadsController {
  static async uploadImage(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.file) throw new AppError("BAD_REQUEST", "No se proporcionó ninguna imagen");
      const result = await StorageFactory.getProvider("image").uploadImage(req.file, req.body.folder ?? "general");
      res.success(result, 201);
    } catch (error) { next(error); }
  }

  static async uploadVideo(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.file) throw new AppError("BAD_REQUEST", "No se proporcionó ningún video");
      const result = await StorageFactory.getProvider("video").uploadVideo(req.file, req.body.folder ?? "general");
      res.success(result, 201);
    } catch (error) { next(error); }
  }

  static async uploadDocument(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.file) throw new AppError("BAD_REQUEST", "No se proporcionó ningún documento");
      const result = await StorageFactory.getProvider("document").uploadFile(req.file, req.body.folder ?? "documents");
      res.success(result, 201);
    } catch (error) { next(error); }
  }
}
