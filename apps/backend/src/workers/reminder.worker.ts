import cron from "node-cron";
import { pushService } from "../modules/push/push.service";
import { reminderService } from "../modules/reminders/reminders.service";

let processing = false;

function notificationUrl(payload: unknown) {
  if (!payload || typeof payload !== "object") return "/";
  const value = payload as { taskId?: string; habitId?: string };
  if (value.taskId) return `/tasks?taskId=${encodeURIComponent(value.taskId)}`;
  return "/";
}

export async function processDueReminders() {
  if (processing) return;
  processing = true;
  try {
    const reminders = await reminderService.due();
    for (const reminder of reminders) {
      try {
        const result = await pushService.sendToUser(reminder.userId, {
          title: reminder.title,
          body: reminder.body ?? undefined,
          url: notificationUrl(reminder.payload),
          tag: `reminder-${reminder.id}`,
          data: { reminderId: reminder.id, payload: reminder.payload },
        });
        if (result.total > 0 && result.sent === 0) continue;
        await reminderService.markProcessed(reminder);
      } catch (error) {
        console.error(`[reminders] No se pudo enviar ${reminder.id}`, error);
      }
    }
  } finally {
    processing = false;
  }
}

export function startReminderWorker() {
  void processDueReminders();
  return cron.schedule("* * * * *", () => void processDueReminders());
}
