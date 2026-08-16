import { DateTime } from "luxon";
import { prisma } from "../infra/prisma/client";
import { pushService } from "../modules/push/push.service";
import { defaultNotificationSettings } from "../utils/notifications/notification-settings";
import { recordNotificationLog } from "../modules/push/notification-log.service";
import { scheduleInTimezone } from "../utils/cron-timezone";
import { eventOccurrenceOn } from "../modules/events/events.util";
import { TIME_BLOCKS_TZ } from "../modules/timeblocks/timeblocks.util";

function nowInTz() {
  return DateTime.now().setZone(TIME_BLOCKS_TZ);
}

function formatMin(value: number) {
  const hours = Math.floor(value / 60).toString().padStart(2, "0");
  const minutes = (value % 60).toString().padStart(2, "0");
  return `${hours}:${minutes}`;
}

function notifiedToday(value: Date | null) {
  if (!value) return false;
  return DateTime.fromJSDate(value).setZone(TIME_BLOCKS_TZ).hasSame(nowInTz(), "day");
}

function formatRemindWindow(mins: number) {
  if (mins <= 0) return "menos de 1 min";
  if (mins >= 10080) {
    const weeks = Math.round(mins / 10080);
    return weeks === 1 ? "1 semana" : `${weeks} semanas`;
  }
  if (mins >= 1440) {
    const days = Math.round(mins / 1440);
    return days === 1 ? "1 día" : `${days} días`;
  }
  if (mins >= 60) {
    const hours = Math.floor(mins / 60);
    return hours === 1 ? "1 hora" : `${hours} horas`;
  }
  return mins === 1 ? "1 min" : `${mins} min`;
}

export async function processEventNotifications() {
  const now = nowInTz();
  const nowMin = now.hour * 60 + now.minute;
  const todayStart = now.startOf("day").toJSDate();
  const todayEnd = now.endOf("day").toJSDate();

  const baseEvents = await prisma.calendarEvent.findMany({
    where: {
      date: { lte: todayEnd },
      OR: [{ recurrenceEndsAt: null }, { recurrenceEndsAt: { gte: todayStart } }],
    },
    include: { exceptions: true, user: true },
  });

  const dueEvents = baseEvents.filter(
    (ev) => eventOccurrenceOn(ev, new Date(), ev.exceptions).occurs,
  );

  const userIds = [...new Set(dueEvents.map((event) => event.userId))];
  const settingsByUser = new Map<string, { eventReminders: boolean }>();
  for (const id of userIds) {
    settingsByUser.set(id, await defaultNotificationSettings(id));
  }

  for (const event of dueEvents) {
    const label = event.title;
    if (!settingsByUser.get(event.userId)?.eventReminders) {
      await recordNotificationLog({
        userId: event.userId,
        event: "event_remind",
        title: label,
        status: "skipped",
        error: "Ajustes: recordatorios de eventos desactivados",
      });
      continue;
    }

    try {
      const occ = eventOccurrenceOn(event, new Date(), event.exceptions);
      if (!occ.occurs) continue;
      const startMin = occ.startMin ?? event.startMin ?? 0;
      const endMin = occ.endMin ?? event.endMin ?? 1440;
      const remindBefore = Math.max(0, event.remindBeforeMin ?? 0);
      const deeplink = `/events?eventId=${event.id}`;

      if (remindBefore > 0) {
        const occStart = now.startOf("day").plus({ minutes: startMin });
        const remindAt = occStart.minus({ minutes: remindBefore });
        const lastRemind = event.lastRemindNotifiedAt
          ? DateTime.fromJSDate(event.lastRemindNotifiedAt).setZone(TIME_BLOCKS_TZ)
          : null;
        const alreadyNotifiedInWindow = lastRemind !== null && lastRemind >= remindAt;
        if (now >= remindAt && now < occStart && !alreadyNotifiedInWindow) {
          const remainingMin = Math.ceil(occStart.diff(now, "minutes").minutes);
          const result = await pushService.sendToUser(event.userId, {
            title: `⏰ «${label}» en ${formatRemindWindow(remainingMin)}`,
            body: `Empieza a las ${formatMin(startMin)}${event.location ? ` en ${event.location}` : ""}`,
            url: deeplink,
            tag: `event-remind-${event.id}-${now.toISODate()}`,
            data: { type: "event_remind", eventId: event.id },
          });
          if (result.sent > 0) {
            await prisma.calendarEvent.update({ where: { id: event.id }, data: { lastRemindNotifiedAt: new Date() } });
          }
        }
      }

      if (!event.allDay && nowMin >= startMin && nowMin < endMin && !notifiedToday(event.lastStartNotifiedAt)) {
        const result = await pushService.sendToUser(event.userId, {
          title: `▶️ «${label}» ya empieza`,
          body: `Hasta ${formatMin(endMin)}${event.location ? ` · ${event.location}` : ""}`,
          url: deeplink,
          tag: `event-start-${event.id}-${now.toISODate()}`,
          data: { type: "event_start", eventId: event.id },
        });
        if (result.sent > 0) {
          await prisma.calendarEvent.update({ where: { id: event.id }, data: { lastStartNotifiedAt: new Date() } });
        }
      }

      const minsToEnd = endMin - nowMin;
      if (!event.allDay && minsToEnd <= 5 && minsToEnd > 0 && !notifiedToday(event.lastEndWarnNotifiedAt)) {
        const result = await pushService.sendToUser(event.userId, {
          title: `⏳ Queda${minsToEnd === 1 ? "" : "n"} ${minsToEnd} min de «${label}»`,
          body: `Termina a las ${formatMin(endMin)}`,
          url: deeplink,
          tag: `event-endwarn-${event.id}-${now.toISODate()}`,
          data: { type: "event_endwarn", eventId: event.id },
        });
        if (result.sent > 0) {
          await prisma.calendarEvent.update({ where: { id: event.id }, data: { lastEndWarnNotifiedAt: new Date() } });
        }
      }
    } catch (error) {
      console.error(`[events] No se pudo notificar evento ${event.id}`, error);
    }
  }
}

export function startEventWorker() {
  void processEventNotifications();
  return scheduleInTimezone("* * * * *", () => void processEventNotifications());
}