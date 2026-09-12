import { hostname } from "node:os";
import { randomUUID } from "node:crypto";
import { uasdQueue } from "../modules/integrations/uasd/uasd.queue";
import { errorDetails } from "../modules/integrations/uasd/uasd.strategy";
import { uasdIntegrationService } from "../modules/integrations/uasd/uasd.service";
import type { UasdSyncJobWithAccount } from "../modules/integrations/uasd/uasd.queue";

const DEFAULT_WORKER_CONCURRENCY = 2;
const DEFAULT_POLL_MS = 2_000;
const SCHEDULE_SCAN_MS = 60_000;
const workerId = `${hostname()}:${process.pid}:${randomUUID()}`;
let processing = false;
let lastScheduleScan = 0;

export async function processUasdQueue(): Promise<number> {
  if (processing) return 0;
  processing = true;
  try {
    await uasdQueue.recoverExpired();
    if (Date.now() - lastScheduleScan >= SCHEDULE_SCAN_MS) {
      await uasdIntegrationService.enqueueDueAccounts();
      lastScheduleScan = Date.now();
    }

    const jobs = await uasdQueue.claimBatch(workerId, configuredPositiveInteger("UASD_WORKER_CONCURRENCY", DEFAULT_WORKER_CONCURRENCY));
    await Promise.all(jobs.map((job) => processJob(job)));
    return jobs.length;
  } finally {
    processing = false;
  }
}

async function processJob(job: UasdSyncJobWithAccount): Promise<void> {
  const claimToken = job.claimedBy ?? workerId;
  const leaseMs = configuredPositiveInteger("UASD_JOB_LEASE_SECONDS", 15 * 60) * 1000;
  const leaseInterval = Math.max(250, Math.min(10_000, Math.floor(leaseMs / 3)));
  const heartbeat = setInterval(() => {
    void uasdQueue.renew(job.id, claimToken).then((renewed) => {
      if (!renewed) console.error(`[uasd] el job ${job.id} perdió su lease de base de datos`);
    }).catch((error) => {
      console.error(`[uasd] no se pudo renovar el lease del job ${job.id}: ${error instanceof Error ? error.message : String(error)}`);
    });
  }, leaseInterval);

  try {
    const report = await uasdIntegrationService.processJob(job, workerId);
    const completed = await uasdQueue.complete(job.id, claimToken);
    if (!completed) console.error(`[uasd] el job ${job.id} perdió su lease antes de completarse`);
    if (completed) await uasdIntegrationService.requeueIfConfigurationChanged(job.accountId, job.configurationVersion);
    if (completed) {
      const stats = report.stats;
      console.info(
        `[uasd] user=${job.account.userId} account=${job.accountId} reason=${job.reason} status=SUCCEEDED synced=${report.synced} created=${report.created ?? 0}`
        + (stats ? ` courses=${stats.courses} events=${stats.calendarEvents} activities=${stats.activityPages} requests=${stats.requests} durationMs=${stats.durationMs}` : ""),
      );
    }
  } catch (error) {
    const details = errorDetails(error);
    const updated = await uasdQueue.fail(job.id, claimToken, details.message, details.retryable);
    if (updated) {
      await uasdIntegrationService.markFailure(job.accountId, job.configurationVersion, error, details.retryable).catch((markError) => {
        console.error(`[uasd] no se pudo guardar el error del job ${job.id}: ${markError instanceof Error ? markError.message : String(markError)}`);
      });
      await uasdIntegrationService.requeueIfConfigurationChanged(job.accountId, job.configurationVersion).catch((requeueError) => {
        console.error(`[uasd] no se pudo reencolar la cuenta ${job.accountId}: ${requeueError instanceof Error ? requeueError.message : String(requeueError)}`);
      });
    }
    console.error(`[uasd] user=${job.account.userId} account=${job.accountId} reason=${job.reason} status=${updated?.status ?? "LOST"} retryable=${details.retryable} error=${details.message}`);
  } finally {
    clearInterval(heartbeat);
  }
}

export function startUasdWorker() {
  let stopped = false;
  const pollMs = configuredPositiveInteger("UASD_WORKER_POLL_MS", DEFAULT_POLL_MS);

  const loop = async () => {
    while (!stopped) {
      try {
        await processUasdQueue();
      } catch (error) {
        console.error(`[uasd] error del worker: ${error instanceof Error ? error.message : String(error)}`);
      }
      if (!stopped) await sleep(pollMs);
    }
  };

  const loopPromise = loop();
  return {
    stop: async () => {
      stopped = true;
      await loopPromise;
    },
  };
}

function configuredPositiveInteger(name: string, fallback: number): number {
  const value = Number(process.env[name]);
  return Number.isSafeInteger(value) && value > 0 ? value : fallback;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
