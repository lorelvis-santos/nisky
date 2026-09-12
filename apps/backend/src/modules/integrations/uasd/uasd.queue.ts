import { randomUUID } from "node:crypto";
import { prisma } from "../../../infra/prisma/client";
import type { UasdSyncJob } from "../../../infra/prisma/generated/prisma/client";

const DEFAULT_MAX_ATTEMPTS = 5;
const DEFAULT_LEASE_SECONDS = 15 * 60;
const DEFAULT_BASE_RETRY_MS = 15 * 60 * 1000;
const MAX_RETRY_MS = 12 * 60 * 60 * 1000;

export type UasdSyncReason = "connect" | "manual" | "scheduled";

export interface UasdSyncJobWithAccount extends UasdSyncJob {
  account: {
    id: string;
    userId: string;
    domain: string;
    username: string;
    passwordCipher: string;
    passwordIv: string;
    passwordAuthTag: string;
    period: string;
    configurationVersion: number;
    enabled: boolean;
    projectId: string | null;
  };
}

export class UasdQueueService {
  async enqueue(accountId: string, reason: UasdSyncReason, configurationVersion: number): Promise<UasdSyncJob> {
    const dedupeKey = `uasd:account:${accountId}`;
    const existing = await prisma.uasdSyncJob.findUnique({ where: { dedupeKey } });
    if (existing) {
      if (existing.status === "PENDING" && existing.configurationVersion !== configurationVersion) {
        return prisma.uasdSyncJob.update({
          where: { id: existing.id },
          data: { configurationVersion, reason, attempts: 0, availableAt: new Date(), lastError: null, startedAt: null },
        });
      }
      return existing;
    }

    try {
      return await prisma.uasdSyncJob.create({
        data: {
          accountId,
          configurationVersion,
          reason,
          maxAttempts: positiveInteger(process.env.UASD_MAX_ATTEMPTS) ?? DEFAULT_MAX_ATTEMPTS,
          dedupeKey,
        },
      });
    } catch (error) {
      // A concurrent enqueue can win the unique dedupe key between the read and create.
      if (!isUniqueViolation(error)) throw error;
      const winner = await prisma.uasdSyncJob.findUnique({ where: { dedupeKey } });
      if (!winner) throw error;
      if (winner.status === "PENDING" && winner.configurationVersion !== configurationVersion) {
        return prisma.uasdSyncJob.update({
          where: { id: winner.id },
          data: { configurationVersion, reason, attempts: 0, availableAt: new Date(), lastError: null, startedAt: null },
        });
      }
      return winner;
    }
  }

  async claimNext(workerId: string): Promise<UasdSyncJobWithAccount | null> {
    const leaseSeconds = positiveInteger(process.env.UASD_JOB_LEASE_SECONDS) ?? DEFAULT_LEASE_SECONDS;
    const claimToken = `${workerId}:${randomUUID()}`;
    const rows = await prisma.$queryRaw<Array<{ id: string }>>`
      WITH candidate AS (
        SELECT "id"
        FROM "UasdSyncJob"
        WHERE "status" = 'PENDING'::"UasdSyncJobStatus"
          AND "availableAt" <= NOW()
        ORDER BY "availableAt" ASC, "createdAt" ASC, "id" ASC
        FOR UPDATE SKIP LOCKED
        LIMIT 1
      )
      UPDATE "UasdSyncJob" AS job
      SET "status" = 'RUNNING'::"UasdSyncJobStatus",
          "attempts" = job."attempts" + 1,
          "claimedAt" = NOW(),
          "claimedBy" = ${claimToken},
          "leaseExpiresAt" = NOW() + (${leaseSeconds} * INTERVAL '1 second'),
          "startedAt" = NOW(),
          "updatedAt" = NOW()
      FROM candidate
      WHERE job."id" = candidate."id"
      RETURNING job."id"
    `;
    const id = rows[0]?.id;
    if (!id) return null;

    const job = await prisma.uasdSyncJob.findUnique({
      where: { id },
      include: {
        account: {
          select: {
            id: true,
            userId: true,
            domain: true,
            username: true,
            passwordCipher: true,
            passwordIv: true,
            passwordAuthTag: true,
            period: true,
            configurationVersion: true,
            enabled: true,
            projectId: true,
          },
        },
      },
    });
    return job as UasdSyncJobWithAccount | null;
  }

  async claimBatch(workerId: string, limit: number): Promise<UasdSyncJobWithAccount[]> {
    const jobs: UasdSyncJobWithAccount[] = [];
    for (let index = 0; index < limit; index += 1) {
      const job = await this.claimNext(workerId);
      if (!job) break;
      jobs.push(job);
    }
    return jobs;
  }

  async renew(jobId: string, workerId: string): Promise<boolean> {
    const leaseSeconds = positiveInteger(process.env.UASD_JOB_LEASE_SECONDS) ?? DEFAULT_LEASE_SECONDS;
    const result = await prisma.uasdSyncJob.updateMany({
      where: { id: jobId, status: "RUNNING", claimedBy: workerId, leaseExpiresAt: { gt: new Date() } },
      data: { leaseExpiresAt: new Date(Date.now() + leaseSeconds * 1000) },
    });
    return result.count === 1;
  }

  async recoverExpired(): Promise<void> {
    const failedAccounts = await prisma.$queryRaw<Array<{ accountId: string }>>`
      UPDATE "UasdSyncJob"
      SET "status" = 'FAILED'::"UasdSyncJobStatus",
          "finishedAt" = NOW(),
          "claimedAt" = NULL,
          "claimedBy" = NULL,
          "leaseExpiresAt" = NULL,
          "lastError" = 'El lease del worker UASD expiró',
          "dedupeKey" = NULL,
          "updatedAt" = NOW()
      WHERE "status" = 'RUNNING'::"UasdSyncJobStatus"
        AND "leaseExpiresAt" < NOW()
        AND "attempts" >= "maxAttempts"
      RETURNING "accountId"
    `;
    if (failedAccounts.length > 0) {
      await prisma.uasdAccount.updateMany({
        where: { id: { in: [...new Set(failedAccounts.map((job) => job.accountId))] } },
        data: { nextSyncAt: nextScheduledSync() },
      });
    }
    await prisma.$executeRaw`
      UPDATE "UasdSyncJob"
      SET "status" = 'PENDING'::"UasdSyncJobStatus",
          "availableAt" = NOW(),
          "claimedAt" = NULL,
          "claimedBy" = NULL,
          "leaseExpiresAt" = NULL,
          "startedAt" = NULL,
          "lastError" = 'El lease del worker UASD expiró; se reintentará',
          "updatedAt" = NOW()
      WHERE "status" = 'RUNNING'::"UasdSyncJobStatus"
        AND "leaseExpiresAt" < NOW()
        AND "attempts" < "maxAttempts"
    `;
  }

  async complete(jobId: string, workerId: string): Promise<boolean> {
    const result = await prisma.uasdSyncJob.updateMany({
      where: { id: jobId, status: "RUNNING", claimedBy: workerId, leaseExpiresAt: { gt: new Date() } },
      data: {
        status: "SUCCEEDED",
        finishedAt: new Date(),
        claimedAt: null,
        claimedBy: null,
        leaseExpiresAt: null,
        lastError: null,
        dedupeKey: null,
      },
    });
    return result.count === 1;
  }

  async fail(jobId: string, workerId: string, error: string, retryable: boolean): Promise<UasdSyncJob | null> {
    const job = await prisma.uasdSyncJob.findFirst({ where: { id: jobId, status: "RUNNING", claimedBy: workerId, leaseExpiresAt: { gt: new Date() } } });
    if (!job) return null;

    const message = error.slice(0, 1000);
    const shouldRetry = retryable && job.attempts < job.maxAttempts;
    const data = shouldRetry
      ? {
          status: "PENDING" as const,
          availableAt: new Date(Date.now() + retryDelay(job.attempts)),
          claimedAt: null,
          claimedBy: null,
          leaseExpiresAt: null,
          startedAt: null,
          lastError: message,
        }
      : {
          status: "FAILED" as const,
          finishedAt: new Date(),
          claimedAt: null,
          claimedBy: null,
          leaseExpiresAt: null,
          lastError: message,
          dedupeKey: null,
        };
    const updatedCount = await prisma.uasdSyncJob.updateMany({
      where: { id: job.id, status: "RUNNING", claimedBy: workerId, leaseExpiresAt: { gt: new Date() } },
      data,
    });
    if (updatedCount.count !== 1) return null;
    return prisma.uasdSyncJob.findUnique({ where: { id: job.id } });
  }

  async cancelPending(accountId: string): Promise<void> {
    await prisma.uasdSyncJob.updateMany({
      where: { accountId, status: "PENDING" },
      data: { status: "CANCELLED", finishedAt: new Date(), dedupeKey: null, lastError: "Cuenta UASD deshabilitada" },
    });
  }

  async getForUser(userId: string, jobId: string) {
    return prisma.uasdSyncJob.findFirst({
      where: { id: jobId, account: { userId } },
      select: {
        id: true,
        accountId: true,
        status: true,
        reason: true,
        attempts: true,
        maxAttempts: true,
        availableAt: true,
        claimedAt: true,
        leaseExpiresAt: true,
        startedAt: true,
        finishedAt: true,
        lastError: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }
}

function retryDelay(attempt: number): number {
  const base = Math.min(MAX_RETRY_MS, DEFAULT_BASE_RETRY_MS * 2 ** Math.max(0, attempt - 1));
  return base + Math.floor(Math.random() * Math.min(base * 0.25, 60_000));
}

function nextScheduledSync(): Date {
  const hours = Number(process.env.UASD_SYNC_INTERVAL_HOURS);
  const interval = Number.isFinite(hours) && hours > 0 ? hours : 3;
  return new Date(Date.now() + interval * 60 * 60 * 1000);
}

function positiveInteger(value: string | undefined): number | undefined {
  if (!value || !/^\d+$/.test(value)) return undefined;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : undefined;
}

function isUniqueViolation(error: unknown): boolean {
  return Boolean(error && typeof error === "object" && "code" in error && error.code === "P2002");
}

export const uasdQueue = new UasdQueueService();
