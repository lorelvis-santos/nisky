import "dotenv/config";
import app from "./app";
import { startReminderWorker } from "./workers/reminder.worker";

const port = Number(process.env.PORT ?? 4000);

app.listen(port, () => {
  console.log(`Nisky backend running on http://localhost:${port}`);
  startReminderWorker();
});
