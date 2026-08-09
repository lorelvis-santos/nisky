import { DateTime } from "luxon";
import { prisma } from "../../infra/prisma/client";
import { computeStreak, dateKey, localDateKey } from "../habits/habit-stats";

const TZ = "America/Santo_Domingo";

function nowInTz() {
  return DateTime.now().setZone(TZ);
}

function toDowIndex(value: DateTime) {
  return value.weekday % 7; // 0=domingo ... 6=sábado
}

function increment(map: Map<string, number>, key: string) {
  map.set(key, (map.get(key) ?? 0) + 1);
}

function dayKey(value: Date) {
  return DateTime.fromJSDate(value).setZone(TZ).toISODate()!;
}

export class HomeService {
  async overview(userId: string) {
    const now = nowInTz();
    const currentMin = now.hour * 60 + now.minute;
    const todayStart = now.startOf("day");
    const tomorrow = todayStart.plus({ days: 1 });
    const dayAfter = tomorrow.plus({ days: 1 });
    const weekStart = todayStart.startOf("week");
    const weekEnd = weekStart.endOf("week");
    const toUtc = (value: DateTime) => value.toUTC().toJSDate();

    const [activeBlock, defaultProject] = await Promise.all([
      prisma.timeBlock.findFirst({
        where: {
          userId,
          isActive: true,
          daysOfWeek: { has: toDowIndex(now) },
          startMin: { lte: currentMin },
          endMin: { gt: currentMin },
        },
        include: { project: true },
      }),
      prisma.project.findFirst({ where: { userId, isDefault: true } }),
    ]);

    const blockTasks = activeBlock?.projectId
      ? await prisma.task.findMany({
          where: { userId, projectId: activeBlock.projectId, status: "PENDING", archivedAt: null },
          orderBy: [{ priority: "desc" }, { dueDate: "asc" }],
          take: 20,
        })
      : [];

    const urgentTasks = await prisma.task.findMany({
      where: {
        userId,
        status: "PENDING",
        archivedAt: null,
        OR: [
          { dueDate: { lt: toUtc(todayStart) } },
          { dueDate: { gte: toUtc(todayStart), lt: toUtc(tomorrow) } },
          { dueDate: null, priority: "HIGH" },
        ],
      },
      orderBy: [{ priority: "desc" }, { dueDate: "asc" }],
      take: 50,
    });

    const futureTasks = await prisma.task.findMany({
      where: {
        userId,
        status: "PENDING",
        archivedAt: null,
        dueDate: { gte: toUtc(tomorrow), lt: toUtc(dayAfter.plus({ days: 1 })) },
      },
      orderBy: [{ dueDate: "asc" }, { priority: "desc" }],
      take: 20,
      include: { project: true },
    });

    const futureBlocks = await prisma.timeBlock.findMany({
      where: {
        userId,
        isActive: true,
        daysOfWeek: { hasSome: [toDowIndex(tomorrow), toDowIndex(dayAfter)] },
      },
      orderBy: [{ startMin: "asc" }, { createdAt: "asc" }],
      include: { project: true },
    });

    const [workSessions, completedTasks, dueTasks] = await Promise.all([
      prisma.pomodoroSession.findMany({
        where: {
          userId,
          status: "COMPLETED",
          phase: "WORK",
          endedAt: { gte: toUtc(weekStart), lte: toUtc(weekEnd) },
        },
        select: { actualSec: true, plannedSec: true },
      }),
      prisma.task.count({
        where: { userId, status: "COMPLETED", completedAt: { gte: toUtc(weekStart), lte: toUtc(weekEnd) } },
      }),
      prisma.task.count({
        where: {
          userId,
          status: "PENDING",
          archivedAt: null,
          dueDate: { gte: toUtc(weekStart), lte: toUtc(weekEnd) },
        },
      }),
    ]);

    return {
      activeBlock,
      blockTasks,
      urgentTasks,
      futureTasks,
      futureBlocks,
      weekly: {
        totalWorkSec: workSessions.reduce((sum, session) => sum + (session.actualSec ?? session.plannedSec), 0),
        completedWorkSessions: workSessions.length,
        completedTasks,
        dueTasks,
        weekStart: weekStart.toISO()!,
        weekEnd: weekEnd.toISO()!,
      },
    };
  }

  async activity(userId: string, weeks = 12) {
    const end = nowInTz().endOf("day");
    const start = end.minus({ weeks }).startOf("day");
    const toUtc = (value: DateTime) => value.toUTC().toJSDate();

    const [tasksDone, habitEntries, pomWork] = await Promise.all([
      prisma.task.findMany({
        where: { userId, status: "COMPLETED", completedAt: { gte: toUtc(start), lte: toUtc(end) } },
        select: { completedAt: true },
      }),
      prisma.habitEntry.findMany({
        where: { userId, completed: true, date: { gte: toUtc(start), lte: toUtc(end) } },
        select: { date: true },
      }),
      prisma.pomodoroSession.findMany({
        where: { userId, status: "COMPLETED", phase: "WORK", endedAt: { gte: toUtc(start), lte: toUtc(end) } },
        select: { endedAt: true },
      }),
    ]);

    const tasks = new Map<string, number>();
    const habits = new Map<string, number>();
    const pomodoro = new Map<string, number>();

    for (const task of tasksDone) if (task.completedAt) increment(tasks, dayKey(task.completedAt));
    for (const entry of habitEntries) increment(habits, dayKey(entry.date));
    for (const session of pomWork) if (session.endedAt) increment(pomodoro, dayKey(session.endedAt));

    const dates = new Set([...tasks.keys(), ...habits.keys(), ...pomodoro.keys()]);
    return Array.from(dates).map((date) => ({
      date,
      tasks: tasks.get(date) ?? 0,
      habits: habits.get(date) ?? 0,
      pomodoro: pomodoro.get(date) ?? 0,
    }));
  }

  async habitsMatrix(userId: string) {
    const now = nowInTz();
    const weekStart = now.startOf("week");
    const weekEnd = weekStart.endOf("week");
    const since = now.minus({ days: 366 }).startOf("day");

    const [habits, entries, history] = await Promise.all([
      prisma.habit.findMany({ where: { userId, archived: false }, orderBy: { createdAt: "asc" } }),
      prisma.habitEntry.findMany({
        where: {
          userId,
          date: { gte: weekStart.toUTC().toJSDate(), lte: weekEnd.toUTC().toJSDate() },
        },
        select: { habitId: true, date: true, completed: true },
      }),
      prisma.habitEntry.findMany({
        where: { userId, completed: true, date: { gte: since.toUTC().toJSDate() } },
        select: { habitId: true, date: true },
        orderBy: { date: "desc" },
      }),
    ]);

    const byHabit = new Map<string, Array<{ date: Date }>>();
    for (const entry of history) {
      const list = byHabit.get(entry.habitId) ?? [];
      list.push({ date: entry.date });
      byHabit.set(entry.habitId, list);
    }

    const today = localDateKey();
    const habitsWithState = habits.map((habit) => {
      const todayEntry = entries.find((entry) => entry.habitId === habit.id && dateKey(entry.date) === today);
      return {
        ...habit,
        todayCompleted: Boolean(todayEntry?.completed),
        streak: computeStreak(byHabit.get(habit.id) ?? []),
      };
    });

    return { habits: habitsWithState, entries };
  }
}

export const homeService = new HomeService();
