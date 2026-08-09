import { prisma } from "../../infra/prisma/client";
import { AppError } from "../../utils/errors/handler";
import type { CreateTimeBlockDto, UpdateTimeBlockDto, UpdateTimeBlockSettingsDto } from "./timeblocks.validator";

const settingsDefaults = {
  dayStartMin: 360,
  dayEndMin: 1380,
};

function nowMinutes(now = new Date()) {
  return now.getHours() * 60 + now.getMinutes();
}

export class TimeBlockService {
  async getSettings(userId: string) {
    return prisma.timeBlockSettings.upsert({
      where: { userId },
      create: { userId, ...settingsDefaults },
      update: {},
    });
  }

  async updateSettings(userId: string, data: UpdateTimeBlockSettingsDto) {
    return prisma.timeBlockSettings.upsert({
      where: { userId },
      create: { userId, ...settingsDefaults, ...data },
      update: data,
    });
  }

  async list(userId: string) {
    return prisma.timeBlock.findMany({
      where: { userId },
      orderBy: [{ startMin: "asc" }, { createdAt: "asc" }],
    });
  }

  async getById(userId: string, id: string) {
    const block = await prisma.timeBlock.findFirst({ where: { id, userId } });
    if (!block) throw new AppError("NOT_FOUND", "Bloque no encontrado");
    return block;
  }

  async activeNow(userId: string) {
    const now = new Date();
    return prisma.timeBlock.findFirst({
      where: {
        userId,
        isActive: true,
        daysOfWeek: { has: now.getDay() },
        startMin: { lte: nowMinutes(now) },
        endMin: { gt: nowMinutes(now) },
      },
      orderBy: { startMin: "asc" },
      include: { project: true },
    });
  }

  async today(userId: string) {
    const now = new Date();
    return prisma.timeBlock.findMany({
      where: { userId, daysOfWeek: { has: now.getDay() } },
      orderBy: [{ startMin: "asc" }, { createdAt: "asc" }],
      include: { project: true },
    });
  }

  private async assertNoOverlap(userId: string, daysOfWeek: number[], startMin: number, endMin: number, excludeId?: string) {
    const overlapping = await prisma.timeBlock.findFirst({
      where: {
        userId,
        id: excludeId ? { not: excludeId } : undefined,
        daysOfWeek: { hasSome: daysOfWeek },
        startMin: { lt: endMin },
        endMin: { gt: startMin },
      },
    });
    if (overlapping) {
      throw new AppError("CONFLICT", "Ya tienes un bloque que se cruza con este horario");
    }
  }

  async create(userId: string, data: CreateTimeBlockDto) {
    if (data.projectId) {
      const project = await prisma.project.findFirst({ where: { id: data.projectId, userId } });
      if (!project) throw new AppError("NOT_FOUND", "Proyecto no encontrado");
    }
    await this.assertNoOverlap(userId, data.daysOfWeek, data.startMin, data.endMin);
    return prisma.timeBlock.create({
      data: {
        userId,
        projectId: data.projectId ?? null,
        name: data.name ?? null,
        daysOfWeek: data.daysOfWeek,
        startMin: data.startMin,
        endMin: data.endMin,
        repeatEveryWeeks: data.repeatEveryWeeks ?? 1,
        repeatEndsAt: data.repeatEndsAt ? new Date(data.repeatEndsAt) : null,
        remindBeforeMin: data.remindBeforeMin ?? 0,
      },
    });
  }

  async update(userId: string, id: string, data: UpdateTimeBlockDto) {
    const current = await this.getById(userId, id);
    if (data.projectId) {
      const project = await prisma.project.findFirst({ where: { id: data.projectId, userId } });
      if (!project) throw new AppError("NOT_FOUND", "Proyecto no encontrado");
    }
    const daysOfWeek = data.daysOfWeek ?? current.daysOfWeek;
    const startMin = data.startMin ?? current.startMin;
    const endMin = data.endMin ?? current.endMin;
    await this.assertNoOverlap(userId, daysOfWeek, startMin, endMin, id);
    const timingChanged =
      data.startMin !== undefined ||
      data.endMin !== undefined ||
      data.daysOfWeek !== undefined ||
      data.remindBeforeMin !== undefined;
    return prisma.timeBlock.update({
      where: { id },
      data: {
        ...(data.projectId !== undefined ? { projectId: data.projectId } : {}),
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.daysOfWeek !== undefined ? { daysOfWeek: data.daysOfWeek } : {}),
        ...(data.startMin !== undefined ? { startMin: data.startMin } : {}),
        ...(data.endMin !== undefined ? { endMin: data.endMin } : {}),
        ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
        ...(data.repeatEveryWeeks !== undefined ? { repeatEveryWeeks: data.repeatEveryWeeks } : {}),
        ...(data.repeatEndsAt !== undefined ? { repeatEndsAt: data.repeatEndsAt ? new Date(data.repeatEndsAt) : null } : {}),
        ...(data.remindBeforeMin !== undefined ? { remindBeforeMin: data.remindBeforeMin } : {}),
        ...(timingChanged
          ? { lastRemindNotifiedAt: null, lastStartNotifiedAt: null, lastEndWarnNotifiedAt: null }
          : {}),
      },
    });
  }

  async delete(userId: string, id: string) {
    await this.getById(userId, id);
    await prisma.timeBlock.delete({ where: { id } });
    return { success: true };
  }
}

export const timeBlockService = new TimeBlockService();
