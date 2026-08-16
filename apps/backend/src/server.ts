import "dotenv/config";
import { createServer } from "node:http";
import app from "./app";
import { initSocket } from "./config/socket";
import { redis, REDIS_LOG_PREFIX } from "./infra/redis/client";
import { startIntegrationsWorker } from "./workers/integration.worker";
import { startReminderWorker } from "./workers/reminder.worker";
import { startTaskRecurrenceWorker } from "./workers/task-recurrence.worker";
import { startTimeBlockWorker } from "./workers/timeblock.worker";
import { startMorningDigestWorker, startTaskNoticeWorker } from "./workers/task-notice.worker";
import { startHabitWorker } from "./workers/habit.worker";
import { startPushCleanupWorker } from "./workers/push-cleanup.worker";

const port = Number(process.env.PORT ?? 4000);

async function checkRedisHealth() {
  try {
    const pong = await redis.ping();
    console.log(`${REDIS_LOG_PREFIX} healthcheck: ${pong === "PONG" ? "OK" : pong}`);
  } catch (error) {
    console.error(`${REDIS_LOG_PREFIX} healthcheck FAILED: ${(error as Error).message}`);
  }
}

const httpServer = createServer(app);
initSocket(httpServer);

httpServer.listen(port, () => {
  console.log(`Nisky backend running on http://localhost:${port}`);
  void checkRedisHealth();
  startReminderWorker();
  startIntegrationsWorker();
  startTimeBlockWorker();
  startTaskRecurrenceWorker();
  startTaskNoticeWorker();
  startMorningDigestWorker();
  startHabitWorker();
  startPushCleanupWorker();
});
