import "dotenv/config";
import app from "./app";
import { startIntegrationsWorker } from "./workers/integration.worker";
import { startReminderWorker } from "./workers/reminder.worker";
import { startTaskRecurrenceWorker } from "./workers/task-recurrence.worker";
import { startTimeBlockWorker } from "./workers/timeblock.worker";
import { startMorningDigestWorker, startTaskNoticeWorker } from "./workers/task-notice.worker";
import { startHabitWorker } from "./workers/habit.worker";

const port = Number(process.env.PORT ?? 4000);

app.listen(port, () => {
  console.log(`Nisky backend running on http://localhost:${port}`);
  startReminderWorker();
  startIntegrationsWorker();
  startTimeBlockWorker();
  startTaskRecurrenceWorker();
  startTaskNoticeWorker();
  startMorningDigestWorker();
  startHabitWorker();
});
