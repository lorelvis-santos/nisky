import "dotenv/config";
import { createServer } from "node:http";
import app from "./app";
import { initSocket } from "./config/socket";
import { startIntegrationsWorker } from "./workers/integration.worker";
import { startReminderWorker } from "./workers/reminder.worker";
import { startTaskRecurrenceWorker } from "./workers/task-recurrence.worker";
import { startTimeBlockWorker } from "./workers/timeblock.worker";
import { startMorningDigestWorker, startTaskNoticeWorker } from "./workers/task-notice.worker";
import { startHabitWorker } from "./workers/habit.worker";

const port = Number(process.env.PORT ?? 4000);

const httpServer = createServer(app);
initSocket(httpServer);

httpServer.listen(port, () => {
  console.log(`Nisky backend running on http://localhost:${port}`);
  startReminderWorker();
  startIntegrationsWorker();
  startTimeBlockWorker();
  startTaskRecurrenceWorker();
  startTaskNoticeWorker();
  startMorningDigestWorker();
  startHabitWorker();
});
