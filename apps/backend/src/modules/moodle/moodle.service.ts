import { prisma } from "../../infra/prisma/client";
import { AppError } from "../../utils/errors/handler";
import { decryptSecret, encryptSecret } from "../../utils/secrets";
import { moodleEvents, moodleToken } from "./moodle.python";
import type { ConnectMoodleDto, MoodleTaskQueryDto } from "./moodle.validator";

type TaskEvent = {
  task_key: string;
  moodle_event_id?: number | null;
  name: string;
  title: string;
  kind: string;
  component?: string | null;
  event_type?: string | null;
  course_id?: number | null;
  course?: string | null;
  course_short?: string | null;
  cmid?: number | null;
  instance?: number | null;
  due_utc?: string | null;
  url?: string | null;
  viewurl?: string | null;
  overdue?: boolean;
};

function publicAccount(account: { id: string; domain: string; username: string; service: string; enabled: boolean; lastSyncAt: Date | null; syncError: string | null; createdAt: Date; updatedAt: Date }) {
  return {
    id: account.id,
    domain: account.domain,
    username: account.username,
    service: account.service,
    enabled: account.enabled,
    lastSyncAt: account.lastSyncAt,
    syncError: account.syncError,
    createdAt: account.createdAt,
    updatedAt: account.updatedAt,
  };
}

export class MoodleService {
  async connect(userId: string, data: ConnectMoodleDto) {
    const domain = data.domain.replace(/\/+$/, "");
    if (data.token) {
      const result = moodleEvents(domain, data.token, 0, 30);
      if (!result.ok) throw new AppError("BAD_REQUEST", result.error);
    } else {
      const result = moodleToken(domain, data.username!, data.password!);
      if (!result.ok) throw new AppError("BAD_REQUEST", result.error);
      if (!result.token) throw new AppError("BAD_REQUEST", "Moodle no devolvió un token");
      data.token = result.token;
    }
    const token = data.token;
    const secret = encryptSecret(token);
    const account = await prisma.moodleAccount.upsert({
      where: { userId_domain: { userId, domain } },
      create: {
        userId,
        domain,
        username: data.username ?? "",
        tokenCipher: secret.cipher,
        tokenIv: secret.iv,
        tokenAuthTag: secret.authTag,
        service: data.service ?? "moodle_mobile_app",
      },
      update: {
        username: data.username ?? "",
        tokenCipher: secret.cipher,
        tokenIv: secret.iv,
        tokenAuthTag: secret.authTag,
        service: data.service ?? "moodle_mobile_app",
        enabled: true,
        syncError: null,
      },
    });
    return publicAccount(account);
  }

  async disconnect(userId: string, id: string) {
    const account = await prisma.moodleAccount.findFirst({ where: { id, userId } });
    if (!account) throw new AppError("NOT_FOUND", "Cuenta de Moodle no encontrada");
    const sourceRefPrefix = `moodle:${account.id}:`;
    const deleted = await prisma.$transaction([
      prisma.moodleAccount.delete({ where: { id: account.id } }),
      prisma.task.deleteMany({
        where: {
          userId,
          source: "MOODLE",
          status: { in: ["PENDING", "IN_PROGRESS"] },
          sourceRef: { startsWith: sourceRefPrefix },
        },
      }),
    ]);
    return { removed: deleted[1].count };
  }

  async cleanIntegrationTasks(userId: string) {
    const result = await prisma.task.deleteMany({
      where: {
        userId,
        source: "MOODLE",
        status: { in: ["PENDING", "IN_PROGRESS"] },
      },
    });
    return { removed: result.count };
  }

  async list(userId: string) {
    const accounts = await prisma.moodleAccount.findMany({ where: { userId }, orderBy: { createdAt: "desc" } });
    return accounts.map(publicAccount);
  }

  async setEnabled(userId: string, id: string, enabled: boolean) {
    const account = await prisma.moodleAccount.findFirst({ where: { id, userId } });
    if (!account) throw new AppError("NOT_FOUND", "Cuenta de Moodle no encontrada");
    const updated = await prisma.moodleAccount.update({ where: { id }, data: { enabled } });
    return publicAccount(updated);
  }

  async getTasks(userId: string, query: MoodleTaskQueryDto) {
    const accounts = await prisma.moodleAccount.findMany({ where: { userId } });
    if (accounts.length === 0) return [];
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 50));
    const now = new Date();
    return prisma.task.findMany({
      where: {
        userId,
        source: "MOODLE",
        archivedAt: null,
        ...(query.status === "overdue"
          ? { status: { in: ["PENDING", "IN_PROGRESS"] }, dueDate: { lt: now } }
          : query.status === "all"
            ? {}
            : { status: { in: ["PENDING", "IN_PROGRESS"] }, OR: [{ dueDate: null }, { dueDate: { gte: now } }] }),
      },
      orderBy: { dueDate: "asc" },
      take: limit,
    });
  }

  async syncAccount(accountId: string): Promise<number> {
    const account = await prisma.moodleAccount.findUnique({ where: { id: accountId } });
    if (!account || !account.enabled) return 0;
    try {
      const token = decryptSecret(account.tokenCipher, account.tokenIv, account.tokenAuthTag);
      const result = moodleEvents(account.domain, token, 14, 365);
      if (!result.ok) throw new Error(result.error);
      const events = (result.events ?? []) as TaskEvent[];
      const now = new Date();
      let synced = 0;
      for (const ev of events) {
        const sourceRef = `moodle:${accountId}:${ev.task_key}`;
        const existing = await prisma.task.findUnique({ where: { userId_source_sourceRef: { userId: account.userId, source: "MOODLE", sourceRef } } });
        // Regla 2: no recargar tareas ya completadas.
        if (existing?.status === "COMPLETED" || existing?.status === "CANCELLED") continue;
        // Regla 3: si fue archivada, no volver a crearla.
        if (existing?.archivedAt) continue;
        const description = [ev.course, ev.url ? `Link: ${ev.url}` : ""].filter(Boolean).join("\n") || null;
        if (existing) {
          await prisma.task.update({
            where: { id: existing.id },
            data: {
              title: ev.title,
              description,
              dueDate: ev.due_utc ? new Date(ev.due_utc) : null,
              priority: taskPriority(ev.due_utc ? new Date(ev.due_utc) : null, now),
            },
          });
        } else {
          await prisma.task.create({
            data: {
              userId: account.userId,
              title: ev.title,
              description,
              source: "MOODLE",
              sourceRef,
              dueDate: ev.due_utc ? new Date(ev.due_utc) : null,
              priority: taskPriority(ev.due_utc ? new Date(ev.due_utc) : null, now),
            },
          });
        }
        synced += 1;
      }
      await prisma.moodleAccount.update({ where: { id: accountId }, data: { lastSyncAt: now, syncError: null } });
      return synced;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await prisma.moodleAccount.update({ where: { id: accountId }, data: { syncError: message.slice(0, 500) } });
      throw error;
    }
  }

  async sync(userId: string, id: string) {
    const account = await prisma.moodleAccount.findFirst({ where: { id, userId } });
    if (!account) throw new AppError("NOT_FOUND", "Cuenta de Moodle no encontrada");
    try {
      const count = await this.syncAccount(id);
      return { synced: count ?? 0 };
    } catch (error) {
      throw new AppError("BAD_REQUEST", error instanceof Error ? error.message : "Error al sincronizar");
    }
  }

  async syncAll() {
    const accounts = await prisma.moodleAccount.findMany({ where: { enabled: true } });
    const results: Record<string, number | string> = {};
    for (const account of accounts) {
      try {
        results[account.id] = await this.syncAccount(account.id);
      } catch (error) {
        results[account.id] = error instanceof Error ? error.message : "error";
      }
    }
    return results;
  }
}

function taskPriority(due: Date | null, now: Date): "LOW" | "NORMAL" | "HIGH" | "URGENT" {
  if (!due) return "NORMAL";
  const days = (due.getTime() - now.getTime()) / 86_400_000;
  if (due < now) return "URGENT";
  if (days < 1) return "URGENT";
  if (days < 3) return "HIGH";
  if (days < 7) return "NORMAL";
  return "LOW";
}

export const moodleService = new MoodleService();
