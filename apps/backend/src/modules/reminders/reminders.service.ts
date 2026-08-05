import { prisma } from "../../infra/prisma/client";
import { AppError } from "../../utils/errors/handler";
import { DateTime } from "luxon";
import type { CreateReminderDto, ReminderQueryDto, SnoozeReminderDto, UpdateReminderDto } from "./reminders.validator";

function nextOccurrence(triggerAt: Date, timezone: string, repeatType: "DAILY" | "WEEKLY" | "MONTHLY", interval: number, days: number[], dayOfMonth: number | null) {
  const local = DateTime.fromJSDate(triggerAt, { zone: timezone });
  if (!local.isValid) return new Date(triggerAt.getTime() + interval * 86_400_000);
  if (repeatType === "DAILY") {
    return local.plus({ days: interval }).toJSDate();
  }
  if (repeatType === "MONTHLY") {
    const requestedDay = dayOfMonth ?? local.day;
    const nextMonth = local.plus({ months: interval }).startOf("month");
    return nextMonth.set({ day: Math.min(requestedDay, nextMonth.daysInMonth) }).toJSDate();
  }

  const normalizedDays = [...new Set(days)].sort((a, b) => a - b);
  if (normalizedDays.length === 0) {
    return local.plus({ weeks: interval }).toJSDate();
  }
  const currentDay = local.weekday % 7;
  const upcoming = normalizedDays.find((day) => day > currentDay);
  const daysUntil = upcoming === undefined ? normalizedDays[0]! + 7 - currentDay : upcoming - currentDay;
  const extraWeeks = upcoming === undefined ? interval - 1 : 0;
  return local.plus({ days: daysUntil, weeks: extraWeeks }).toJSDate();
}

export class ReminderService {
  async list(userId: string, query: ReminderQueryDto) {
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 50));
    return prisma.reminder.findMany({
      where: { userId, ...(query.status === "active" ? { isActive: true } : query.status === "inactive" ? { isActive: false } : {}) },
      orderBy: { triggerAt: "asc" },
      take: limit,
    });
  }

  async getById(userId: string, id: string) {
    const reminder = await prisma.reminder.findFirst({ where: { id, userId } });
    if (!reminder) throw new AppError("NOT_FOUND", "Recordatorio no encontrado");
    return reminder;
  }

  async create(userId: string, data: CreateReminderDto) {
    const triggerAt = new Date(data.triggerAt);
    if (triggerAt <= new Date()) throw new AppError("BAD_REQUEST", "La fecha del recordatorio debe ser futura");
    return prisma.reminder.create({
      data: {
        userId,
        title: data.title,
        body: data.body,
        triggerAt,
        timezone: data.timezone,
        repeatType: data.repeatType,
        repeatInterval: data.repeatInterval,
        repeatDaysOfWeek: data.repeatDaysOfWeek,
        repeatDayOfMonth: data.repeatDayOfMonth,
        payload: data.payload,
      },
    });
  }

  async update(userId: string, id: string, data: UpdateReminderDto) {
    await this.getById(userId, id);
    if (data.triggerAt && new Date(data.triggerAt) <= new Date()) {
      throw new AppError("BAD_REQUEST", "La fecha del recordatorio debe ser futura");
    }
    return prisma.reminder.update({
      where: { id },
      data: {
        ...data,
        ...(data.triggerAt ? { triggerAt: new Date(data.triggerAt) } : {}),
      },
    });
  }

  async delete(userId: string, id: string) {
    const result = await prisma.reminder.deleteMany({ where: { id, userId } });
    if (result.count !== 1) throw new AppError("NOT_FOUND", "Recordatorio no encontrado");
  }

  async snooze(userId: string, id: string, data: SnoozeReminderDto) {
    await this.getById(userId, id);
    return prisma.reminder.update({
      where: { id },
      data: { triggerAt: new Date(Date.now() + data.minutes * 60_000), isActive: true, sentAt: null },
    });
  }

  due(limit = 100) {
    return prisma.reminder.findMany({
      where: { isActive: true, triggerAt: { lte: new Date() } },
      orderBy: { triggerAt: "asc" },
      take: limit,
    });
  }

  async markProcessed(reminder: Awaited<ReturnType<ReminderService["due"]>>[number]) {
    if (!reminder.repeatType) {
      await prisma.reminder.update({ where: { id: reminder.id }, data: { isActive: false, sentAt: new Date() } });
      return;
    }
    const next = nextOccurrence(reminder.triggerAt, reminder.timezone, reminder.repeatType, reminder.repeatInterval, reminder.repeatDaysOfWeek, reminder.repeatDayOfMonth);
    await prisma.reminder.update({ where: { id: reminder.id }, data: { triggerAt: next, sentAt: new Date(), isActive: true } });
  }
}

export const reminderService = new ReminderService();
