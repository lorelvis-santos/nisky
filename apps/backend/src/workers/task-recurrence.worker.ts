import cron from "node-cron";
import { DateTime } from "luxon";
import { prisma } from "../infra/prisma/client";
import { nextOccurrence } from "../utils/recurrence";
import { getProjectAudience } from "../modules/projects/access";
import { emitToUsers } from "../config/socket.emit";

const TZ = "America/Santo_Domingo";

export async function processRecurringTasks() {
  const today = DateTime.now().setZone(TZ).startOf("day");
  const templates = await prisma.task.findMany({
    where: {
      archivedAt: null,
      recurrenceType: { not: null },
      dueDate: { lt: today.toJSDate() },
    },
  });

  for (const task of templates) {
    if (!task.recurrenceType || !task.dueDate) continue;
    const templateId = task.recurrenceParentId ?? task.id;
    let next = nextOccurrence(
      task.dueDate,
      TZ,
      task.recurrenceType,
      task.recurrenceInterval,
      task.recurrenceDaysOfWeek,
      task.recurrenceDayOfMonth ?? null,
    );
    let guard = 0;
    while (next < today.toJSDate() && guard < 365) {
      next = nextOccurrence(
        next,
        TZ,
        task.recurrenceType,
        task.recurrenceInterval,
        task.recurrenceDaysOfWeek,
        task.recurrenceDayOfMonth ?? null,
      );
      guard += 1;
    }
    if (guard === 365 || next > today.toJSDate()) continue;
    if (task.recurrenceEndsAt && next > task.recurrenceEndsAt) continue;

    const existing = await prisma.task.findFirst({
      where: { recurrenceParentId: templateId, dueDate: next },
    });
    if (existing) continue;

    const created = await prisma.task.create({
      data: {
        userId: task.userId,
        title: task.title,
        description: task.description,
        priority: task.priority,
        projectId: task.projectId,
        pomodoroEstimate: task.pomodoroEstimate,
        dueDate: next,
        source: "MANUAL",
        status: "PENDING",
        recurrenceType: task.recurrenceType,
        recurrenceInterval: task.recurrenceInterval,
        recurrenceDaysOfWeek: task.recurrenceDaysOfWeek,
        recurrenceDayOfMonth: task.recurrenceDayOfMonth,
        recurrenceEndsAt: task.recurrenceEndsAt,
        recurrenceParentId: templateId,
      },
    });
    const audience = [created.userId];
    if (created.projectId) {
      audience.push(...(await getProjectAudience(created.projectId)));
    }
    emitToUsers([...new Set(audience)], "tasks");
  }
}

export function startTaskRecurrenceWorker() {
  void processRecurringTasks();
  return cron.schedule("7 5 * * *", () => void processRecurringTasks());
}
