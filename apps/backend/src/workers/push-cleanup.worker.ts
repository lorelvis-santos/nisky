import { prisma } from "../infra/prisma/client";
import { scheduleInTimezone } from "../utils/cron-timezone";

const CLEANUP_GRACE_HOURS = 24;

export async function processPushSubscriptionCleanup() {
  const cutoff = new Date(Date.now() - CLEANUP_GRACE_HOURS * 3_600_000);
  const result = await prisma.pushSubscription.deleteMany({
    where: { disabledAt: { lt: cutoff } },
  });
  if (result.count > 0) console.log(`[push-cleanup] borradas ${result.count} suscripciones caducadas`);
}

export function startPushCleanupWorker() {
  return scheduleInTimezone("30 4 * * *", () => void processPushSubscriptionCleanup());
}