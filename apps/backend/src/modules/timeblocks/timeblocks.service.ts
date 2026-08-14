import { prisma } from "../../infra/prisma/client";
import { AppError } from "../../utils/errors/handler";
import { blockOccurrenceOn, dayOfWeek, nowMinutes, TIME_BLOCKS_TZ } from "./timeblocks.util";
import { DateTime } from "luxon";
import type { CreateTimeBlockDto, UpdateTimeBlockDto, UpdateTimeBlockSettingsDto } from "./timeblocks.validator";

const settingsDefaults = {
  dayStartMin: 360,
  dayEndMin: 1380,
};

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
    const candidates = await prisma.timeBlock.findMany({
      where: {
        userId,
        isActive: true,
        daysOfWeek: { has: dayOfWeek(now) },
        startMin: { lte: nowMinutes(now) },
        endMin: { gt: nowMinutes(now) },
      },
      include: { project: true },
    });
    return candidates.find((block) => blockOccurrenceOn(block, now).occurs) ?? null;
  }

  async today(userId: string) {
    const now = new Date();
    const candidates = await prisma.timeBlock.findMany({
      where: { userId, daysOfWeek: { has: dayOfWeek(now) } },
      include: { project: true },
    });
    return candidates
      .filter((block) => blockOccurrenceOn(block, now).occurs)
      .sort((a, b) => a.startMin - b.startMin || a.createdAt.getTime() - b.createdAt.getTime());
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

    const exceptions = await prisma.timeBlockException.findMany({
      where: {
        userId,
        action: "move",
        blockId: excludeId ? { not: excludeId } : undefined,
      },
    });
    const exceptionClash = exceptions.some(
      (exc) =>
        daysOfWeek.includes(dayOfWeek(exc.date)) &&
        exc.startMin !== null &&
        exc.endMin !== null &&
        exc.startMin < endMin &&
        exc.endMin > startMin,
    );
    if (exceptionClash) {
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

    if (
      data.startMin !== undefined ||
      data.endMin !== undefined ||
      data.daysOfWeek !== undefined
    ) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      await prisma.timeBlockException.deleteMany({
        where: {
          blockId: id,
          date: { gte: today },
        },
      });
    }

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

  async createException(userId: string, id: string, data: import("./timeblocks.validator").CreateTimeBlockExceptionDto) {
    await this.getById(userId, id);
    const dateObj = DateTime.fromISO(data.date, { zone: TIME_BLOCKS_TZ }).startOf("day").toJSDate();

    if (data.action === "move" && data.startMin !== undefined && data.endMin !== undefined) {
      const sameDayExceptions = await prisma.timeBlockException.findMany({ where: { userId, date: dateObj } });
      const blocks = await prisma.timeBlock.findMany({ where: { userId } });
      for (const block of blocks) {
        if (block.id === id) continue;
        const occ = blockOccurrenceOn(block, dateObj, sameDayExceptions);
        if (!occ.occurs || occ.startMin >= data.endMin || occ.endMin <= data.startMin) continue;
        throw new AppError("CONFLICT", "Ya tienes un bloque que se cruza con este horario");
      }
    }

    return prisma.timeBlockException.upsert({
      where: { blockId_date: { blockId: id, date: dateObj } },
      create: {
        blockId: id,
        userId,
        date: dateObj,
        action: data.action as any,
        startMin: data.startMin,
        endMin: data.endMin,
      },
      update: {
        action: data.action as any,
        startMin: data.startMin,
        endMin: data.endMin,
      },
    });
  }

  async listExceptions(userId: string, blockId: string) {
    await this.getById(userId, blockId);
    return prisma.timeBlockException.findMany({
      where: { userId, blockId },
      orderBy: { date: "asc" },
    });
  }

  async listAllExceptions(userId: string, from?: Date, to?: Date) {
    return prisma.timeBlockException.findMany({
      where: {
        userId,
        ...(from ? { date: { gte: from } } : {}),
        ...(to ? { date: { lte: to } } : {}),
      },
      orderBy: { date: "asc" },
    });
  }

  async deleteException(userId: string, blockId: string, exceptionId: string) {
    await this.getById(userId, blockId);
    const exception = await prisma.timeBlockException.findFirst({
      where: { id: exceptionId, userId, blockId },
    });
    if (!exception) throw new AppError("NOT_FOUND", "Excepción no encontrada");
    await prisma.timeBlockException.delete({ where: { id: exceptionId } });
    return { success: true };
  }
}

export const timeBlockService = new TimeBlockService();
