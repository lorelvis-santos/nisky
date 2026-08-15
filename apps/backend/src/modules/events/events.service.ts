import { prisma } from "../../infra/prisma/client";
import { AppError } from "../../utils/errors/handler";
import { DateTime } from "luxon";
import { blockOccurrenceOn, TIME_BLOCKS_TZ } from "../timeblocks/timeblocks.util";
import type { CreateEventDto, UpdateEventDto } from "./events.validator";

const EVENT_COLORS = [
  "#303e51",
  "#006d77",
  "#8b5e3c",
  "#6b4f4f",
  "#2d5a27",
  "#5c1a1a",
  "#1a3a5c",
  "#4a4a2a",
];

function randomEventColor() {
  return EVENT_COLORS[Math.floor(Math.random() * EVENT_COLORS.length)];
}

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

  private async assertNoBlockOverlap(userId: string, date: Date, startMin: number | null, endMin: number | null) {
    const dayExceptions = await prisma.timeBlockException.findMany({ where: { userId, date } });
    const blocks = await prisma.timeBlock.findMany({
      where: { userId },
      include: { project: { select: { name: true } } },
    });
    for (const block of blocks) {
      const occ = blockOccurrenceOn(block, date, dayExceptions);
      if (!occ.occurs) continue;
      const clash =
        startMin === null || endMin === null
          ? true
          : occ.startMin < endMin && occ.endMin > startMin;
      if (!clash) continue;
      const label = block.name ?? block.project?.name ?? "bloque";
      const dayName = DateTime.fromJSDate(date, { zone: TIME_BLOCKS_TZ }).toFormat("EEE d MMM", { locale: "es" });
      const time = `${String(Math.floor(occ.startMin / 60)).padStart(2, "0")}:${String(occ.startMin % 60).padStart(2, "0")}–${String(Math.floor(occ.endMin / 60)).padStart(2, "0")}:${String(occ.endMin % 60).padStart(2, "0")}`;
      throw new AppError(
        "CONFLICT",
        `Choca con el bloque "${label}" (${dayName} ${time}). Muévelo en la Agenda o sáltalo ese día.`,
      );
    }
  }

  async create(userId: string, data: CreateEventDto) {
    const localDate = DateTime.fromISO(data.date, { zone: TIME_BLOCKS_TZ }).startOf("day").toJSDate();
    const startMin = data.allDay ? null : data.startMin ?? null;
    const endMin = data.allDay ? null : data.endMin ?? null;
    await this.assertNoBlockOverlap(userId, localDate, startMin, endMin);
    return prisma.calendarEvent.create({
      data: {
        userId,
        title: data.title,
        date: localDate,
        allDay: data.allDay,
        startMin,
        endMin,
        location: data.location,
        color: data.color ?? randomEventColor(),
      },
    });
  }

  async update(userId: string, id: string, data: UpdateEventDto) {
    const current = await this.getById(userId, id);
    const localDate = data.date ? DateTime.fromISO(data.date, { zone: TIME_BLOCKS_TZ }).startOf("day").toJSDate() : current.date;
    const allDay = data.allDay ?? current.allDay;
    const startMin = allDay ? null : (data.startMin ?? current.startMin);
    const endMin = allDay ? null : (data.endMin ?? current.endMin);
    await this.assertNoBlockOverlap(userId, localDate, startMin, endMin);

    return prisma.calendarEvent.update({
      where: { id },
      data: {
        title: data.title,
        date: localDate,
        allDay,
        startMin,
        endMin,
        location: data.location,
        ...(data.color !== undefined ? { color: data.color } : {}),
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
