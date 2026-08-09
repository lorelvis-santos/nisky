import cron from "node-cron";
import { DateTime } from "luxon";
import { prisma } from "../infra/prisma/client";
import { pushService } from "../modules/push/push.service";
import { mondayInTz, weeksBetween } from "../utils/recurrence";
import { defaultNotificationSettings } from "../utils/notifications/notification-settings";
import { recordNotificationLog } from "../modules/push/notification-log.service";

const TZ = "America/Santo_Domingo";

function nowInTz() {
  return DateTime.now().setZone(TZ);
}

function nowMinutes() {
  const now = nowInTz();
  return now.hour * 60 + now.minute;
}

function todayDayOfWeek() {
  const now = nowInTz();
  return now.weekday % 7;
}

function formatMin(value: number) {
  const hours = Math.floor(value / 60).toString().padStart(2, "0");
  const minutes = (value % 60).toString().padStart(2, "0");
  return `${hours}:${minutes}`;
}

function notifiedToday(value: Date | null) {
  if (!value) return false;
  return DateTime.fromJSDate(value).setZone(TZ).hasSame(nowInTz(), "day");
}

export async function processTimeBlockNotifications() {
  const nowMin = nowMinutes();
  const dayOfWeek = todayDayOfWeek();

  const dayBlocks = await prisma.timeBlock.findMany({
    where: {
      isActive: true,
      daysOfWeek: { has: dayOfWeek },
      endMin: { gt: nowMin },
    },
    include: { project: true, user: true },
  });

  const dueBlocks = dayBlocks.filter((block) => {
    if (block.repeatEndsAt && mondayInTz(new Date(), TZ) > mondayInTz(block.repeatEndsAt, TZ)) return false;
    if (block.repeatEveryWeeks > 1) {
      const weeks = weeksBetween(block.createdAt, new Date(), TZ);
      if (weeks % block.repeatEveryWeeks !== 0) return false;
    }
    return true;
  });

  const userIds = [...new Set(dueBlocks.map((block) => block.userId))];
  const settingsByUser = new Map<string, { timeBlockReminders: boolean }>();
  for (const id of userIds) {
    settingsByUser.set(id, await defaultNotificationSettings(id));
  }

  for (const block of dueBlocks) {
    const label = block.project?.name ?? block.name ?? "Bloque de enfoque";
    if (!settingsByUser.get(block.userId)?.timeBlockReminders) {
      await recordNotificationLog({
        userId: block.userId,
        event: "timeblock_remind",
        title: label,
        status: "skipped",
        error: "Ajustes: recordatorios de agenda desactivados",
      });
      continue;
    }

    try {
      const remindBefore = Math.max(0, block.remindBeforeMin);
      const started = nowMin >= block.startMin;
      const shouldRemindBefore = remindBefore > 0 && !started && nowMin >= block.startMin - remindBefore && nowMin < block.startMin;

      if (shouldRemindBefore && !notifiedToday(block.lastRemindNotifiedAt) && !notifiedToday(block.lastStartNotifiedAt)) {
        await pushService.sendToUser(block.userId, {
          title: `En ${block.startMin - nowMin} min: ${label}`,
          body: `Empieza a las ${formatMin(block.startMin)}`,
          url: `/tasks?projectId=${block.projectId ?? ""}&view=day`,
          tag: `timeblock-remind-${block.id}`,
          data: { timeBlockId: block.id, type: "timeblock_remind" },
        });
        await prisma.timeBlock.update({ where: { id: block.id }, data: { lastRemindNotifiedAt: new Date() } });
      }

      if (started && !notifiedToday(block.lastStartNotifiedAt)) {
        await pushService.sendToUser(block.userId, {
          title: `Empieza: ${label}`,
          body: `De ${formatMin(block.startMin)} a ${formatMin(block.endMin)}`,
          url: `/tasks?projectId=${block.projectId ?? ""}&view=day`,
          tag: `timeblock-start-${block.id}`,
          data: { timeBlockId: block.id, type: "timeblock_start" },
        });
        await prisma.timeBlock.update({ where: { id: block.id }, data: { lastStartNotifiedAt: new Date() } });
      }

      const minsToEnd = block.endMin - nowMin;
      if (minsToEnd <= 5 && minsToEnd > 0 && !notifiedToday(block.lastEndWarnNotifiedAt)) {
        await pushService.sendToUser(block.userId, {
          title: `Quedan ${minsToEnd} min`,
          body: `Termina ${label} a las ${formatMin(block.endMin)}`,
          url: `/tasks?projectId=${block.projectId ?? ""}&view=day`,
          tag: `timeblock-endwarn-${block.id}`,
          data: { timeBlockId: block.id, type: "timeblock_endwarn" },
        });
        await prisma.timeBlock.update({ where: { id: block.id }, data: { lastEndWarnNotifiedAt: new Date() } });
      }
    } catch (error) {
      console.error(`[timeblocks] No se pudo notificar el bloque ${block.id}`, error);
    }
  }
}

export function startTimeBlockWorker() {
  void processTimeBlockNotifications();
  return cron.schedule("* * * * *", () => void processTimeBlockNotifications());
}
