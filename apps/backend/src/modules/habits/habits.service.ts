import { prisma } from "../../infra/prisma/client";
import { AppError } from "../../utils/errors/handler";
import { computeStreak, dateKey, habitDate, localDateKey } from "./habit-stats";
import type { CreateHabitDto, EntriesQueryDto, ToggleEntryDto, UpdateHabitDto } from "./habits.validator";

export class HabitService {
  async list(userId: string, includeArchived = false) {
    const habits = await prisma.habit.findMany({
      where: { userId, ...(includeArchived ? {} : { archived: false }) },
      orderBy: { createdAt: "asc" },
    });
    return Promise.all(habits.map(async (habit) => {
      const today = localDateKey();
      const [todayEntry, streak] = await Promise.all([
        prisma.habitEntry.findUnique({ where: { habitId_date: { habitId: habit.id, date: habitDate(today) } } }),
        this.streak(userId, habit.id),
      ]);
      return { ...habit, todayCompleted: Boolean(todayEntry?.completed), streak };
    }));
  }

  async getById(userId: string, id: string) {
    const habit = await prisma.habit.findFirst({
      where: { id, userId },
      include: { entries: { orderBy: { date: "desc" }, take: 90 } },
    });
    if (!habit) throw new AppError("NOT_FOUND", "Hábito no encontrado");
    return habit;
  }

  async create(userId: string, data: CreateHabitDto) {
    return prisma.habit.create({
      data: {
        userId,
        name: data.name,
        color: data.color || null,
        frequency: data.frequency ?? "DAILY",
        targetDays: data.targetDays ?? 7,
      },
    });
  }

  async update(userId: string, id: string, data: UpdateHabitDto) {
    await this.getById(userId, id);
    return prisma.habit.update({
      where: { id },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.color !== undefined ? { color: data.color || null } : {}),
        ...(data.frequency !== undefined ? { frequency: data.frequency } : {}),
        ...(data.targetDays !== undefined ? { targetDays: data.targetDays } : {}),
        ...(data.archived !== undefined ? { archived: data.archived } : {}),
      },
    });
  }

  async delete(userId: string, id: string) {
    await this.getById(userId, id);
    await prisma.habit.delete({ where: { id } });
  }

  async toggleEntry(userId: string, habitId: string, data: ToggleEntryDto) {
    await this.getById(userId, habitId);
    const date = habitDate(data.date);
    const existing = await prisma.habitEntry.findUnique({ where: { habitId_date: { habitId, date } } });
    if (existing && data.completed !== false) {
      await prisma.habitEntry.delete({ where: { id: existing.id } });
      return { completed: false, streak: await this.streak(userId, habitId) };
    }
    if (existing) {
      const entry = await prisma.habitEntry.update({ where: { id: existing.id }, data: { completed: false } });
      return { completed: entry.completed, streak: await this.streak(userId, habitId) };
    }
    await prisma.habitEntry.create({ data: { userId, habitId, date, completed: true } });
    return { completed: true, streak: await this.streak(userId, habitId) };
  }

  async entries(userId: string, habitId: string, query: EntriesQueryDto) {
    await this.getById(userId, habitId);
    return prisma.habitEntry.findMany({
      where: {
        userId,
        habitId,
        ...(query.from || query.to ? {
          date: {
            ...(query.from ? { gte: habitDate(query.from) } : {}),
            ...(query.to ? { lte: habitDate(query.to) } : {}),
          },
        } : {}),
      },
      orderBy: { date: "desc" },
    });
  }

  async streak(userId: string, habitId: string) {
    const entries = await prisma.habitEntry.findMany({
      where: { userId, habitId, completed: true },
      orderBy: { date: "desc" },
      take: 366,
      select: { date: true },
    });
    return computeStreak(entries);
  }
}

export const habitService = new HabitService();
