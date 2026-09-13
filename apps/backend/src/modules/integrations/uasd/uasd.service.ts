import { DateTime } from "luxon";
import { prisma } from "../../../infra/prisma/client";
import { decryptSecret, encryptSecret } from "../../../utils/secrets";
import { AppError } from "../../../utils/errors/handler";
import { emitToUsers } from "../../../config/socket.emit";
import { pushService } from "../../push/push.service";
import { defaultNotificationSettings } from "../../../utils/notifications/notification-settings";
import type { ConnectUasdDto } from "../integration.validator";
import type { IntegrationProvider } from "../strategies";
import type { UasdAccount, UasdSyncJob } from "../../../infra/prisma/generated/prisma/client";
import type { UasdRemoteItem, UasdScrapeStats } from "../../../../scripts/uasd/types";
import { uasdQueue, type UasdSyncJobWithAccount, type UasdSyncReason } from "./uasd.queue";
import { UASD_ACCOUNT_DOMAIN, UasdIntegrationError, errorDetails, uasdStrategy } from "./uasd.strategy";
import { latestUasdPeriod } from "./uasd.period";

const UASD_PROJECT_NAME = "UASD";
const DEFAULT_SYNC_INTERVAL_HOURS = 3;

export interface UasdProcessReport {
  synced: number;
  skipped: boolean;
  stale?: boolean;
  created?: number;
  stats?: UasdScrapeStats;
}

export function uasdAccountRow(account: UasdAccount) {
  return {
    id: account.id,
    provider: "UASD" as IntegrationProvider,
    domain: account.domain,
    username: account.username,
    service: null,
    period: account.period,
    enabled: account.enabled,
    lastSyncAt: account.lastSyncAt,
    nextSyncAt: account.nextSyncAt,
    syncError: account.syncError,
    createdAt: account.createdAt,
    updatedAt: account.updatedAt,
  };
}

export function uasdJobRow(job: UasdSyncJob) {
  return {
    id: job.id,
    accountId: job.accountId,
    status: job.status,
    reason: job.reason,
    attempts: job.attempts,
    maxAttempts: job.maxAttempts,
    availableAt: job.availableAt,
    claimedAt: job.claimedAt,
    leaseExpiresAt: job.leaseExpiresAt,
    startedAt: job.startedAt,
    finishedAt: job.finishedAt,
    lastError: job.lastError,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
  };
}

export class UasdIntegrationService {
  async connect(userId: string, data: ConnectUasdDto) {
    const password = encryptSecret(data.password);
    const period = latestUasdPeriod();
    const account = await prisma.uasdAccount.upsert({
      where: { userId_domain: { userId, domain: UASD_ACCOUNT_DOMAIN } },
      create: {
        userId,
        domain: UASD_ACCOUNT_DOMAIN,
        username: data.username,
        passwordCipher: password.cipher,
        passwordIv: password.iv,
        passwordAuthTag: password.authTag,
        period,
        nextSyncAt: new Date(),
        projectId: (await this.ensureProject(userId)).id,
      },
      update: {
        username: data.username,
        passwordCipher: password.cipher,
        passwordIv: password.iv,
        passwordAuthTag: password.authTag,
        period,
        configurationVersion: { increment: 1 },
        enabled: true,
        nextSyncAt: new Date(),
        syncError: null,
      },
    });
    const project = account.projectId ? null : await this.ensureProject(userId);
    const saved = project
      ? await prisma.uasdAccount.update({ where: { id: account.id }, data: { projectId: project.id } })
      : account;
    await uasdQueue.cancelPending(saved.id);
    try {
      const result = await this.syncAccountNow(saved);
      const synced = await prisma.uasdAccount.findUnique({ where: { id: saved.id } });
      return { ...uasdAccountRow(synced ?? saved), synced: result.synced };
    } catch (error) {
      const details = errorDetails(error);
      await this.markFailure(saved.id, saved.configurationVersion, error, details.retryable).catch((markError) => {
        console.error(`[uasd] no se pudo guardar el error de conexión: ${markError instanceof Error ? markError.message : String(markError)}`);
      });
      throw new AppError("BAD_REQUEST", details.message);
    }
  }

  async list(userId: string) {
    const accounts = await prisma.uasdAccount.findMany({ where: { userId }, orderBy: { createdAt: "desc" } });
    return accounts.map(uasdAccountRow);
  }

  async enqueue(userId: string, accountId: string, reason: Exclude<UasdSyncReason, "connect"> = "manual") {
    const account = await this.getAccount(userId, accountId);
    if (!account.enabled) throw new AppError("BAD_REQUEST", "La cuenta UASD está deshabilitada");
    const job = await uasdQueue.enqueue(account.id, reason, account.configurationVersion);
    return uasdJobRow(job);
  }

  async getJob(userId: string, jobId: string) {
    const job = await uasdQueue.getForUser(userId, jobId);
    if (!job) throw new AppError("NOT_FOUND", "Trabajo UASD no encontrado");
    return job;
  }

  async setEnabled(userId: string, accountId: string, enabled: boolean) {
    const account = await this.getAccount(userId, accountId);
    const updated = await prisma.uasdAccount.update({
      where: { id: account.id },
      data: {
        enabled,
        configurationVersion: { increment: 1 },
        ...(enabled ? { nextSyncAt: new Date(), syncError: null } : {}),
      },
    });
    if (!enabled) await uasdQueue.cancelPending(account.id);
    if (enabled) await uasdQueue.enqueue(account.id, "scheduled", updated.configurationVersion);
    return uasdAccountRow(updated);
  }

  async disconnect(userId: string, accountId: string) {
    const account = await this.getAccount(userId, accountId);
    await prisma.$transaction([
      prisma.uasdAccount.delete({ where: { id: account.id } }),
      prisma.task.deleteMany({
        where: {
          userId,
          source: "UASD",
          status: { in: ["PENDING", "IN_PROGRESS"] },
          sourceRef: { startsWith: `uasd:${account.id}:` },
        },
      }),
    ]);
    return { removed: 1 };
  }

  async enqueueDueAccounts(limit = 100): Promise<number> {
    const accounts = await prisma.uasdAccount.findMany({
      where: { enabled: true, nextSyncAt: { lte: new Date() } },
      select: { id: true, configurationVersion: true },
      orderBy: { nextSyncAt: "asc" },
      take: limit,
    });
    for (const account of accounts) {
      await uasdQueue.enqueue(account.id, "scheduled", account.configurationVersion);
    }
    return accounts.length;
  }

  async processJob(job: UasdSyncJobWithAccount, workerId: string): Promise<UasdProcessReport> {
    const current = await prisma.uasdAccount.findUnique({ where: { id: job.account.id } });
    if (!current || !current.enabled) return { synced: 0, skipped: true };
    if (current.configurationVersion !== job.configurationVersion) return { synced: 0, skipped: true, stale: true };

    let password: string;
    try {
      password = decryptSecret(current.passwordCipher, current.passwordIv, current.passwordAuthTag);
    } catch {
      throw new UasdIntegrationError("CREDENTIALS_UNAVAILABLE", "No se pudieron descifrar las credenciales UASD", false);
    }

    const result = await uasdStrategy.fetchItems(
      {
        userId: current.userId,
        accountId: current.id,
        username: current.username,
        password,
        period: current.period,
      },
      workerId,
      { daysPast: 14, daysAhead: 365 },
    );

    const beforePersist = await prisma.uasdAccount.findUnique({ where: { id: current.id } });
    if (!beforePersist || !beforePersist.enabled) return { synced: 0, skipped: true };
    if (beforePersist.configurationVersion !== job.configurationVersion) return { synced: 0, skipped: true, stale: true };
    const persisted = await this.persistItems(beforePersist, result.items, job.id, job.claimedBy ?? workerId);
    return { ...persisted, stats: result.stats };
  }

  private async syncAccountNow(account: UasdAccount) {
    const current = await prisma.uasdAccount.findUnique({ where: { id: account.id } });
    if (!current || !current.enabled) return { synced: 0, skipped: true };

    let password: string;
    try {
      password = decryptSecret(current.passwordCipher, current.passwordIv, current.passwordAuthTag);
    } catch {
      throw new UasdIntegrationError("CREDENTIALS_UNAVAILABLE", "No se pudieron descifrar las credenciales UASD", false);
    }

    const result = await uasdStrategy.fetchItems(
      {
        userId: current.userId,
        accountId: current.id,
        username: current.username,
        password,
        period: current.period,
      },
      `api:${process.pid}`,
      { daysPast: 14, daysAhead: 365 },
    );

    const beforePersist = await prisma.uasdAccount.findUnique({ where: { id: current.id } });
    if (!beforePersist || !beforePersist.enabled || beforePersist.configurationVersion !== current.configurationVersion) {
      return { synced: 0, skipped: true };
    }
    return this.persistItems(beforePersist, result.items);
  }

  async requeueIfConfigurationChanged(accountId: string, configurationVersion: number): Promise<void> {
    const account = await prisma.uasdAccount.findUnique({ where: { id: accountId } });
    if (!account || !account.enabled || account.configurationVersion === configurationVersion) return;
    await uasdQueue.enqueue(account.id, "scheduled", account.configurationVersion);
  }

  async markFailure(accountId: string, configurationVersion: number, error: unknown, retryable: boolean): Promise<void> {
    const details = errorDetails(error);
    const account = await prisma.uasdAccount.findFirst({
      where: { id: accountId, configurationVersion },
      select: { userId: true, syncError: true },
    });
    if (!account) return;
    const updated = await prisma.uasdAccount.updateMany({
      where: { id: accountId, configurationVersion },
      data: {
        syncError: details.message.slice(0, 500),
        nextSyncAt: nextSyncAt(),
        ...(retryable ? {} : { enabled: false }),
      },
    });
    if (updated.count !== 1 || account.syncError) return;
    try {
      const settings = await defaultNotificationSettings(account.userId);
      if (!settings.integrationErrors) return;
      await pushService.sendToUser(account.userId, {
        title: "⚠️ Sin conexión con UASD",
        body: "No pudimos sincronizar; revisa tu cuenta en Ajustes",
        url: "/settings",
        tag: `uasd-sync-error-${accountId}-${new Date().toISOString().slice(0, 10)}`,
        data: { integrationAccountId: accountId, type: "uasd_sync_error" },
      });
    } catch (notificationError) {
      console.error(`[uasd] no se pudo notificar el error de la cuenta ${accountId}: ${notificationError instanceof Error ? notificationError.message : String(notificationError)}`);
    }
  }

  private async persistItems(account: UasdAccount, items: UasdRemoteItem[], jobId?: string, claimToken?: string) {
    let projectId = account.projectId;
    let synced = 0;
    let created = 0;
    let outcome: "persisted" | "stale" | "disabled" = "persisted";

    await prisma.$transaction(async (tx) => {
      const accountRows = await tx.$queryRaw<Array<{ enabled: boolean; configurationVersion: number; projectId: string | null }>>`
        SELECT "enabled", "configurationVersion", "projectId"
        FROM "UasdAccount"
        WHERE "id" = ${account.id}
        FOR UPDATE
      `;
      const currentAccount = accountRows[0];
      if (!currentAccount || !currentAccount.enabled) {
        outcome = "disabled";
        return;
      }
      if (currentAccount.configurationVersion !== account.configurationVersion) {
        outcome = "stale";
        return;
      }
      projectId = currentAccount.projectId;
      if (!projectId) {
        const project = await tx.project.upsert({
          where: { userId_name: { userId: account.userId, name: UASD_PROJECT_NAME } },
          create: { userId: account.userId, name: UASD_PROJECT_NAME, isDefault: false },
          update: {},
        });
        projectId = project.id;
      }

      if (jobId && claimToken) {
        const ownership = await tx.$queryRaw<Array<{ status: string; claimedBy: string | null; leaseExpiresAt: Date | null }>>`
          SELECT "status", "claimedBy", "leaseExpiresAt"
          FROM "UasdSyncJob"
          WHERE "id" = ${jobId}
          FOR UPDATE
        `;
        const claim = ownership[0];
        if (!claim || claim.status !== "RUNNING" || claim.claimedBy !== claimToken || !claim.leaseExpiresAt || claim.leaseExpiresAt <= new Date()) {
          throw new UasdIntegrationError("LEASE_LOST", "El job UASD perdió su lease antes de guardar resultados", true);
        }
      }
      for (const item of items) {
        const sourceRef = `uasd:${account.id}:${item.key}`;
        const existing = await tx.task.findUnique({ where: { userId_source_sourceRef: { userId: account.userId, source: "UASD", sourceRef } } });
        if (existing?.status === "COMPLETED" || existing?.status === "CANCELLED" || existing?.archivedAt) continue;

        const dueDate = parseDate(item.dueDate);
        const data = {
          title: item.title,
          description: item.description,
          dueDate,
          priority: taskPriority(dueDate, new Date()),
          projectId,
          ...(item.completed ? { status: "COMPLETED" as const } : {}),
        };
        let taskId = existing?.id;
        if (existing) {
          await tx.task.update({ where: { id: existing.id }, data });
        } else {
          const createdTask = await tx.task.create({
            data: {
              userId: account.userId,
              source: "UASD",
              sourceRef,
              status: item.completed ? "COMPLETED" : "PENDING",
              ...data,
            },
          });
          taskId = createdTask.id;
          created += 1;
        }
        if (!taskId) throw new UasdIntegrationError("PERSIST_FAILED", "La tarea UASD no tiene identificador", true);
        if (item.url) {
          await tx.taskReference.upsert({
            where: { taskId_source_sourceRef: { taskId, source: "UASD", sourceRef } },
            create: { taskId, userId: account.userId, title: item.title, url: item.url, source: "UASD", sourceRef, order: 0 },
            update: { title: item.title, url: item.url },
          });
        } else {
          await tx.taskReference.deleteMany({ where: { taskId, source: "UASD", sourceRef } });
        }
        synced += 1;
      }
      await tx.uasdAccount.update({
        where: { id: account.id },
        data: {
          projectId,
          lastSyncAt: new Date(),
          nextSyncAt: nextSyncAt(),
          syncError: null,
        },
      });
    });

    if (outcome !== "persisted") return { synced: 0, skipped: true, ...(outcome === "stale" ? { stale: true } : {}) };
    const savedProjectId = projectId;
    if (!savedProjectId) throw new UasdIntegrationError("PERSIST_FAILED", "La cuenta UASD no tiene proyecto de destino", true);

    emitToUsers([account.userId], "tasks", { projectId: savedProjectId });
    if (created > 0) await this.notifyNewTasks(account, savedProjectId, created);
    return { synced, created, skipped: false };
  }

  private async notifyNewTasks(account: UasdAccount, projectId: string, created: number) {
    try {
      const settings = await defaultNotificationSettings(account.userId);
      if (!settings.integrationNews) return;
      await pushService.sendToUser(account.userId, {
        title: "📚 UASD",
        body: `${created === 1 ? "1 tarea nueva" : `${created} tareas nuevas`} ya está${created === 1 ? "" : "n"} en tus tareas`,
        url: `/tasks?projectId=${encodeURIComponent(projectId)}`,
        tag: `uasd-sync-${account.id}-${new Date().toISOString().slice(0, 10)}`,
        data: { integrationAccountId: account.id, type: "uasd_sync_new_tasks", created },
      });
    } catch (error) {
      console.error(`[uasd] no se pudo notificar la cuenta ${account.id}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async getAccount(userId: string, accountId: string) {
    const account = await prisma.uasdAccount.findFirst({ where: { id: accountId, userId } });
    if (!account) throw new AppError("NOT_FOUND", "Cuenta UASD no encontrada");
    return account;
  }

  private async ensureProject(userId: string) {
    return prisma.project.upsert({
      where: { userId_name: { userId, name: UASD_PROJECT_NAME } },
      create: { userId, name: UASD_PROJECT_NAME, isDefault: false },
      update: {},
    });
  }

}

function parseDate(value: string | null): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function nextSyncAt(): Date {
  const hours = Number(process.env.UASD_SYNC_INTERVAL_HOURS);
  const interval = Number.isFinite(hours) && hours > 0 ? hours : DEFAULT_SYNC_INTERVAL_HOURS;
  return DateTime.now().plus({ hours: interval }).toJSDate();
}

function taskPriority(due: Date | null, now: Date): "LOW" | "NORMAL" | "HIGH" | "URGENT" {
  if (!due) return "NORMAL";
  const days = (due.getTime() - now.getTime()) / 86_400_000;
  if (due <= now || days < 1) return "URGENT";
  if (days < 3) return "HIGH";
  if (days < 7) return "NORMAL";
  return "LOW";
}

export const uasdIntegrationService = new UasdIntegrationService();
