import { prisma } from "../../infra/prisma/client";
import { AppError } from "../../utils/errors/handler";
import { DateTime } from "luxon";
import { TIME_BLOCKS_TZ } from "../timeblocks/timeblocks.util";
import type { CreateEventDto, UpdateEventDto } from "./events.validator";

export class EventsService {
  async list(userId: string, from: Date, to: Date) {
    return prisma.calendarEvent.findMany({
      where: {
        userId,
        date: { gte: from, lte: to },
      },
      orderBy: [{ date: "asc" }, { startMin: "asc" }],
    });
  }

  async today(userId: string) {
    const todayStart = DateTime.now().setZone(TIME_BLOCKS_TZ).startOf("day").toJSDate();
    const tomorrowStart = DateTime.now().setZone(TIME_BLOCKS_TZ).plus({ days: 1 }).startOf("day").toJSDate();
    return prisma.calendarEvent.findMany({
      where: {
        userId,
        date: { gte: todayStart, lt: tomorrowStart },
      },
      orderBy: [{ startMin: "asc" }],
    });
  }

  async getById(userId: string, id: string) {
    const event = await prisma.calendarEvent.findFirst({ where: { id, userId } });
    if (!event) throw new AppError("NOT_FOUND", "Evento no encontrado");
    return event;
  }

  async create(userId: string, data: CreateEventDto) {
    const localDate = DateTime.fromISO(data.date).setZone(TIME_BLOCKS_TZ).startOf("day").toJSDate();
    return prisma.calendarEvent.create({
      data: {
        userId,
        title: data.title,
        date: localDate,
        allDay: data.allDay,
        startMin: data.allDay ? null : data.startMin,
        endMin: data.allDay ? null : data.endMin,
        location: data.location,
      },
    });
  }

  async update(userId: string, id: string, data: UpdateEventDto) {
    const current = await this.getById(userId, id);
    const localDate = data.date ? DateTime.fromISO(data.date).setZone(TIME_BLOCKS_TZ).startOf("day").toJSDate() : current.date;
    const allDay = data.allDay ?? current.allDay;
    const startMin = allDay ? null : (data.startMin ?? current.startMin);
    const endMin = allDay ? null : (data.endMin ?? current.endMin);

    return prisma.calendarEvent.update({
      where: { id },
      data: {
        title: data.title,
        date: localDate,
        allDay,
        startMin,
        endMin,
        location: data.location,
      },
    });
  }

  async delete(userId: string, id: string) {
    await this.getById(userId, id);
    await prisma.calendarEvent.delete({ where: { id } });
    return { success: true };
  }
}

export const eventsService = new EventsService();
