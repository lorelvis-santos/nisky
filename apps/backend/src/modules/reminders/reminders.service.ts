import { prisma } from "../../infra/prisma/client";
import { AppError } from "../../utils/errors/handler";
import { nextOccurrence } from "../../utils/recurrence";
import type { CreateReminderDto, ReminderQueryDto, ResolveReminderDto, SnoozeReminderDto, UpdateReminderDto } from "./reminders.validator";

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

  pending(userId: string) {
    return prisma.reminder.findMany({
      where: { userId, isActive: true, resolvedAt: null, triggerAt: { lte: new Date() } },
      orderBy: { triggerAt: "asc" },
    });
  }

  async resolve(userId: string, id: string, data: ResolveReminderDto) {
    const reminder = await this.getById(userId, id);
    if (data.action === "accept") {
      if (!reminder.repeatType) {
        return prisma.reminder.update({ where: { id }, data: { isActive: false, resolvedAt: new Date() } });
      }
      const next = nextOccurrence(reminder.triggerAt, reminder.timezone, reminder.repeatType, reminder.repeatInterval, reminder.repeatDaysOfWeek, reminder.repeatDayOfMonth);
      return prisma.reminder.update({ where: { id }, data: { triggerAt: next, sentAt: null, isActive: true } });
    }
    const triggerAt = new Date(data.triggerAt);
    if (triggerAt <= new Date()) throw new AppError("BAD_REQUEST", "La fecha del recordatorio debe ser futura");
    return prisma.reminder.update({
      where: { id },
      data: { triggerAt, sentAt: null, isActive: true, resolvedAt: null },
    });
  }

  due(limit = 100) {
    return prisma.reminder.findMany({
      where: { isActive: true, sentAt: null, triggerAt: { lte: new Date() } },
      orderBy: { triggerAt: "asc" },
      take: limit,
    });
  }

  async markSent(reminder: Awaited<ReturnType<ReminderService["due"]>>[number]) {
    await prisma.reminder.update({ where: { id: reminder.id }, data: { sentAt: new Date() } });
  }

  async advanceOverdueRepeats() {
    const overdue = await prisma.reminder.findMany({
      where: {
        isActive: true,
        sentAt: { not: null },
        resolvedAt: null,
        repeatType: { not: null },
        triggerAt: { lte: new Date() },
      },
      take: 200,
    });
    for (const reminder of overdue) {
      if (!reminder.repeatType) continue;
      let next = nextOccurrence(
        reminder.triggerAt,
        reminder.timezone,
        reminder.repeatType,
        reminder.repeatInterval,
        reminder.repeatDaysOfWeek,
        reminder.repeatDayOfMonth,
      );
      let guard = 0;
      while (next <= new Date() && guard < 365) {
        next = nextOccurrence(
          next,
          reminder.timezone,
          reminder.repeatType,
          reminder.repeatInterval,
          reminder.repeatDaysOfWeek,
          reminder.repeatDayOfMonth,
        );
        guard += 1;
      }
      if (guard === 365) continue;
      await prisma.reminder.update({ where: { id: reminder.id }, data: { triggerAt: next, sentAt: null } });
    }
  }
}

export const reminderService = new ReminderService();
