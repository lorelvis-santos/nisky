import type { Request, Response, NextFunction } from "express";
import { eventsService } from "./events.service";

export class EventsController {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const fromDate = new Date(req.query.from as string);
      const toDate = new Date(req.query.to as string);
      const events = await eventsService.list(req.user!.id, fromDate, toDate);
      res.success(events);
    } catch (error) {
      next(error);
    }
  }

  async today(req: Request, res: Response, next: NextFunction) {
    try {
      const events = await eventsService.today(req.user!.id);
      res.success(events);
    } catch (error) {
      next(error);
    }
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const event = await eventsService.create(req.user!.id, req.body);
      res.status(201).success(event);
    } catch (error) {
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const event = await eventsService.update(req.user!.id, req.params.id as string, req.body);
      res.success(event);
    } catch (error) {
      next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      await eventsService.delete(req.user!.id, req.params.id as string);
      res.success({ success: true });
    } catch (error) {
      next(error);
    }
  }
}

export const eventsController = new EventsController();
