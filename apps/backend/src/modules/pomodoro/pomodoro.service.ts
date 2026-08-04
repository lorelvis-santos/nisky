import { prisma } from "../../infra/prisma/client";
import { AppError } from "../../utils/errors/handler";
import { buildPaginatedResponse, getPaginationArgs } from "../../utils/pagination/handler";
import type { SessionActionDto, SessionQueryDto, StartSessionDto, StatsQueryDto, UpdateSettingsDto } from "./pomodoro.validator";

const defaults = {
  workSec: 1500,
  shortBreakSec: 300,
  longBreakSec: 900,
  cyclesPerLong: 4,
  autoCycle: false,
  soundEnabled: true,
};

function phaseDuration(phase: StartSessionDto["phase"], settings: typeof defaults) {
  if (phase === "SHORT_BREAK") return settings.shortBreakSec;
  if (phase === "LONG_BREAK") return settings.longBreakSec;
  return settings.workSec;
}

function dateValue(value: string | undefined) {
  return value ? new Date(value) : undefined;
}

function elapsedSec(session: { startedAt: Date; plannedSec: number; totalPausedSec: number; pausedAt: Date | null }, end: Date) {
  const total = Math.floor((end.getTime() - session.startedAt.getTime()) / 1000);
  const currentPause = session.pausedAt ? Math.floor((end.getTime() - session.pausedAt.getTime()) / 1000) : 0;
  return Math.max(0, Math.min(session.plannedSec, total - session.totalPausedSec - currentPause));
}

export class PomodoroService {
  async getSettings(userId: string) {
    return prisma.pomodoroSettings.upsert({
      where: { userId },
      create: { userId, ...defaults },
      update: {},
    });
  }

  async updateSettings(userId: string, data: UpdateSettingsDto) {
    return prisma.pomodoroSettings.upsert({
      where: { userId },
      create: { userId, ...defaults, ...data },
      update: data,
    });
  }

  async list(userId: string, query: SessionQueryDto) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const { skip, take } = getPaginationArgs(page, limit);
    const where = {
      userId,
      ...(query.phase ? { phase: query.phase } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.taskId ? { taskId: query.taskId } : {}),
      ...(query.from || query.to ? { startedAt: { ...(query.from ? { gte: dateValue(query.from) } : {}), ...(query.to ? { lte: dateValue(query.to) } : {}) } } : {}),
    };
    const [data, total] = await Promise.all([
      prisma.pomodoroSession.findMany({ where, skip, take, orderBy: { startedAt: "desc" }, include: { task: { select: { id: true, title: true } } } }),
      prisma.pomodoroSession.count({ where }),
    ]);
    return buildPaginatedResponse(data, total, page, limit);
  }

  async getById(userId: string, id: string) {
    const session = await prisma.pomodoroSession.findFirst({ where: { id, userId }, include: { task: { select: { id: true, title: true } } } });
    if (!session) throw new AppError("NOT_FOUND", "Sesión Pomodoro no encontrada");
    return session;
  }

  async start(userId: string, data: StartSessionDto) {
    const active = await prisma.pomodoroSession.findFirst({ where: { userId, status: { in: ["ACTIVE", "PAUSED"] } } });
    if (active) throw new AppError("CONFLICT", "Ya existe una sesión Pomodoro activa");
    if (data.taskId) {
      const task = await prisma.task.findFirst({ where: { id: data.taskId, userId } });
      if (!task) throw new AppError("NOT_FOUND", "Tarea no encontrada");
    }
    const settings = await this.getSettings(userId);
    return prisma.pomodoroSession.create({
      data: {
        userId,
        taskId: data.taskId ?? null,
        phase: data.phase,
        plannedSec: phaseDuration(data.phase, settings),
        cycleIndex: data.cycleIndex,
      },
      include: { task: { select: { id: true, title: true } } },
    });
  }

  async action(userId: string, id: string, data: SessionActionDto) {
    const session = await this.getById(userId, id);
    const now = new Date();
    if (data.action === "PAUSE") {
      if (session.status !== "ACTIVE") throw new AppError("CONFLICT", "La sesión no está activa");
      return prisma.pomodoroSession.update({ where: { id }, data: { status: "PAUSED", pausedAt: now }, include: { task: { select: { id: true, title: true } } } });
    }
    if (data.action === "RESUME") {
      if (session.status !== "PAUSED" || !session.pausedAt) throw new AppError("CONFLICT", "La sesión no está pausada");
      const pauseSec = Math.floor((now.getTime() - session.pausedAt.getTime()) / 1000);
      return prisma.pomodoroSession.update({ where: { id }, data: { status: "ACTIVE", pausedAt: null, totalPausedSec: { increment: pauseSec } }, include: { task: { select: { id: true, title: true } } } });
    }
    if (session.status !== "ACTIVE" && session.status !== "PAUSED") throw new AppError("CONFLICT", "La sesión ya terminó");
    const actualSec = elapsedSec(session, now);
    if (data.action === "CANCEL") {
      return prisma.pomodoroSession.update({ where: { id }, data: { status: "CANCELLED", actualSec, endedAt: now }, include: { task: { select: { id: true, title: true } } } });
    }
    return prisma.$transaction(async (transaction) => {
      const updated = await transaction.pomodoroSession.update({ where: { id }, data: { status: "COMPLETED", actualSec: session.plannedSec, endedAt: now, pausedAt: null }, include: { task: { select: { id: true, title: true } } } });
      if (session.phase === "WORK" && session.taskId) {
        await transaction.task.updateMany({ where: { id: session.taskId, userId }, data: { pomodoroCount: { increment: 1 } } });
      }
      return updated;
    });
  }

  async stats(userId: string, query: StatsQueryDto) {
    const sessions = await prisma.pomodoroSession.findMany({
      where: { userId, status: "COMPLETED", ...(query.from || query.to ? { endedAt: { ...(query.from ? { gte: dateValue(query.from) } : {}), ...(query.to ? { lte: dateValue(query.to) } : {}) } } : {}) },
      select: { phase: true, actualSec: true, endedAt: true },
    });
    const work = sessions.filter((session) => session.phase === "WORK");
    const activeDays = new Set(sessions.filter((session) => session.phase === "WORK" && session.endedAt).map((session) => session.endedAt!.toISOString().slice(0, 10))).size;
    return {
      totalSessions: sessions.length,
      completedSessions: sessions.length,
      completedWorkSessions: work.length,
      totalWorkSec: work.reduce((total, session) => total + (session.actualSec ?? 0), 0),
      totalBreakSec: sessions.filter((session) => session.phase !== "WORK").reduce((total, session) => total + (session.actualSec ?? 0), 0),
      activeDays,
    };
  }
}

export const pomodoroService = new PomodoroService();
