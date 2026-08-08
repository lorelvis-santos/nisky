import { prisma } from "../../infra/prisma/client";
import { AppError } from "../../utils/errors/handler";
import { decryptSecret, encryptSecret } from "../../utils/secrets";
import { getStrategy } from "./strategies";
import type { IntegrationProvider } from "./strategies";
import type { ConnectMoodleDto, IntegrationTaskQueryDto } from "./integration.validator";
import { projectService } from "../projects/projects.service";
import { hostOf, universityNameFor } from "./university-catalog";

async function ensureUniversityProject(userId: string, domain: string) {
  const displayName = universityNameFor(domain) ?? hostOf(domain);
  const existing = await prisma.project.findFirst({ where: { userId, name: displayName, isDefault: false } });
  if (existing) return existing;
  return prisma.project.create({ data: { userId, name: displayName } });
}

type Delegate = typeof prisma.moodleAccount;

function delegateFor(provider: IntegrationProvider): Delegate {
  return provider === "MOODLE" ? prisma.moodleAccount : (prisma.canvasAccount as unknown as Delegate);
}

function accountRow(account: {
  id: string;
  domain: string;
  username: string;
  service?: string;
  enabled: boolean;
  lastSyncAt: Date | null;
  syncError: string | null;
  createdAt: Date;
  updatedAt: Date;
}, provider: IntegrationProvider) {
  return {
    id: account.id,
    provider,
    domain: account.domain,
    username: account.username,
    service: account.service ?? null,
    enabled: account.enabled,
    lastSyncAt: account.lastSyncAt,
    syncError: account.syncError,
    createdAt: account.createdAt,
    updatedAt: account.updatedAt,
  };
}

export class IntegrationService {
  async connect(userId: string, provider: IntegrationProvider, rawData: ConnectMoodleDto) {
    const strategy = getStrategy(provider);
    const { domain, username, token } = await strategy.connect(rawData);
    const secret = encryptSecret(token);
    const delegate = delegateFor(provider);
    const account = await delegate.upsert({
      where: { userId_domain: { userId, domain } },
      create: {
        userId,
        domain,
        username,
        tokenCipher: secret.cipher,
        tokenIv: secret.iv,
        tokenAuthTag: secret.authTag,
        ...(provider === "MOODLE" ? { service: rawData.service ?? "moodle_mobile_app" } : {}),
      },
      update: {
        username,
        tokenCipher: secret.cipher,
        tokenIv: secret.iv,
        tokenAuthTag: secret.authTag,
        ...(provider === "MOODLE" ? { service: rawData.service ?? "moodle_mobile_app" } : {}),
        enabled: true,
        syncError: null,
      },
    });
    if (!account.projectId) {
      const project = await ensureUniversityProject(account.userId, account.domain);
      await delegate.update({ where: { id: account.id }, data: { projectId: project.id } });
    }
    return accountRow(account, provider);
  }

  async disconnect(userId: string, provider: IntegrationProvider, id: string) {
    const delegate = delegateFor(provider);
    const strategy = getStrategy(provider);
    const account = await delegate.findFirst({ where: { id, userId } });
    if (!account) throw new AppError("NOT_FOUND", `Cuenta de ${provider} no encontrada`);
    const sourceRefPrefix = `${strategy.prefix}${account.id}:`;
    const deleted = await prisma.$transaction([
      delegate.delete({ where: { id: account.id } }),
      prisma.task.deleteMany({
        where: {
          userId,
          source: strategy.source,
          status: { in: ["PENDING", "IN_PROGRESS"] },
          sourceRef: { startsWith: sourceRefPrefix },
        },
      }),
    ]);
    if (account.projectId) {
      const otherRefs =
        (await prisma.moodleAccount.count({ where: { userId, projectId: account.projectId } })) +
        (await prisma.canvasAccount.count({ where: { userId, projectId: account.projectId } }));
      if (otherRefs === 0) {
        const project = await prisma.project.findFirst({
          where: { id: account.projectId, userId, isDefault: false },
        });
        if (project) {
          try {
            await projectService.delete(userId, project.id);
          } catch {
            // La limpieza del proyecto no debe fallar la desconexión.
          }
        }
      }
    }
    return { removed: deleted[1].count };
  }

  async cleanTasks(userId: string, source?: IntegrationProvider) {
    const result = await prisma.task.deleteMany({
      where: {
        userId,
        source: source ? source : { in: ["MOODLE", "CANVAS"] },
        status: { in: ["PENDING", "IN_PROGRESS"] },
      },
    });
    return { removed: result.count };
  }

  async list(userId: string) {
    const [moodleAccounts, canvasAccounts] = await Promise.all([
      prisma.moodleAccount.findMany({ where: { userId }, orderBy: { createdAt: "desc" } }),
      prisma.canvasAccount.findMany({ where: { userId }, orderBy: { createdAt: "desc" } }),
    ]);
    return [
      ...moodleAccounts.map((account) => accountRow(account, "MOODLE")),
      ...canvasAccounts.map((account) => accountRow(account, "CANVAS")),
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async setEnabled(userId: string, provider: IntegrationProvider, id: string, enabled: boolean) {
    const delegate = delegateFor(provider);
    const account = await delegate.findFirst({ where: { id, userId } });
    if (!account) throw new AppError("NOT_FOUND", `Cuenta de ${provider} no encontrada`);
    const updated = await delegate.update({ where: { id }, data: { enabled } });
    return accountRow(updated, provider);
  }

  async getTasks(userId: string, query: IntegrationTaskQueryDto) {
    const now = new Date();
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 50));
    if (query.source) {
      const accounts = await delegateFor(query.source).findMany({ where: { userId } });
      if (accounts.length === 0) return [];
    }
    return prisma.task.findMany({
      where: {
        userId,
        source: query.source ? query.source : { in: ["MOODLE", "CANVAS"] },
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

  async syncAccount(provider: IntegrationProvider, accountId: string): Promise<number> {
    const delegate = delegateFor(provider);
    const strategy = getStrategy(provider);
    const account = await delegate.findUnique({ where: { id: accountId } });
    if (!account || !account.enabled) return 0;
    try {
      const token = decryptSecret(account.tokenCipher, account.tokenIv, account.tokenAuthTag);
      const items = await strategy.fetchItems(account.domain, token, { daysPast: 14, daysAhead: 365 });
      const now = new Date();
      const projectId = account.projectId ?? (await projectService.getDefaultId(account.userId));
      let synced = 0;
      for (const item of items) {
        const sourceRef = `${strategy.prefix}${accountId}:${item.key}`;
        const existing = await prisma.task.findUnique({ where: { userId_source_sourceRef: { userId: account.userId, source: strategy.source, sourceRef } } });
        if (existing?.status === "COMPLETED" || existing?.status === "CANCELLED") continue;
        if (existing?.archivedAt) continue;
        const dueDate = item.dueDate ? new Date(item.dueDate) : null;
        if (existing) {
          await prisma.task.update({
            where: { id: existing.id },
            data: { title: item.title, description: item.description, dueDate, priority: taskPriority(dueDate, now), projectId },
          });
        } else {
          await prisma.task.create({
            data: {
              userId: account.userId,
              title: item.title,
              description: item.description,
              source: strategy.source,
              sourceRef,
              dueDate,
              priority: taskPriority(dueDate, now),
              projectId,
            },
          });
        }
        synced += 1;
      }
      await delegate.update({ where: { id: accountId }, data: { lastSyncAt: now, syncError: null } });
      return synced;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await delegate.update({ where: { id: accountId }, data: { syncError: message.slice(0, 500) } });
      throw error;
    }
  }

  async sync(userId: string, provider: IntegrationProvider, id: string) {
    const account = await delegateFor(provider).findFirst({ where: { id, userId } });
    if (!account) throw new AppError("NOT_FOUND", `Cuenta de ${provider} no encontrada`);
    try {
      const count = await this.syncAccount(provider, id);
      return { synced: count ?? 0 };
    } catch (error) {
      throw new AppError("BAD_REQUEST", error instanceof Error ? error.message : "Error al sincronizar");
    }
  }

  async syncAll(provider?: IntegrationProvider) {
    const providers = (provider ? [provider] : ["MOODLE", "CANVAS"]) as IntegrationProvider[];
    const results: Record<string, number | string> = {};
    for (const p of providers) {
      const accounts = await delegateFor(p).findMany({ where: { enabled: true } });
      for (const account of accounts) {
        try {
          results[account.id] = await this.syncAccount(p, account.id);
        } catch (error) {
          results[account.id] = error instanceof Error ? error.message : "error";
        }
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

export const integrationService = new IntegrationService();