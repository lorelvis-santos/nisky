import { DateTime } from "luxon";
import { prisma } from "../infra/prisma/client";
import { pushService } from "../modules/push/push.service";
import { computeStreak, localDateKey } from "../modules/habits/habit-stats";
import { defaultNotificationSettings } from "../utils/notifications/notification-settings";
import { scheduleInTimezone } from "../utils/cron-timezone";

const TZ = "America/Santo_Domingo";

function notifiedToday(value: Date | null) {
  if (!value) return false;
  return DateTime.fromJSDate(value).setZone(TZ).hasSame(DateTime.now().setZone(TZ), "day");
}

export async function processHabitReminders() {
  const today = localDateKey();
  const todaysWeekday = DateTime.now().setZone(TZ).weekday % 7;
  const habits = await prisma.habit.findMany({
    where: { archived: false },
    include: { entries: { orderBy: { date: "desc" }, take: 30 } },
  });

  const userIds = [...new Set(habits.map((habit) => habit.userId))];
  const settingsByUser = new Map<string, { habitReminders: boolean }>();
  for (const id of userIds) {
    settingsByUser.set(id, await defaultNotificationSettings(id));
  }

  let reminded = 0;
  for (const habit of habits) {
    if (!settingsByUser.get(habit.userId)?.habitReminders) continue;
    if (notifiedToday(habit.lastRemindedAt)) continue;
    if (habit.daysOfWeek.length > 0 && !habit.daysOfWeek.includes(todaysWeekday)) continue;
    const doneToday = habit.entries.some(
      (entry) => entry.completed && localDateKey(entry.date) === today,
    );
    if (doneToday) continue;

    const streak = computeStreak(habit.entries, today, habit.daysOfWeek);
    const pendingTitle = `🔁 «${habit.name}» te espera`;
    const streakTitle = `🔥 «${habit.name}», ${streak} días seguidos`;

    try {
      const result = await pushService.sendToUser(habit.userId, {
        title: streak >= 2 ? streakTitle : pendingTitle,
        body: streak >= 2 ? "La racha vive hoy también" : "Un paso corto también cuenta",
        url: "/",
        tag: `habit-${habit.id}-${today}`,
        data: { habitId: habit.id, type: "habit_remind", streak },
      });
      if (result.sent > 0) {
        await prisma.habit.update({ where: { id: habit.id }, data: { lastRemindedAt: new Date() } });
        reminded += 1;
      }
    } catch (error) {
      console.error(`[habits] No se pudo recordar el hábito ${habit.id}`, error);
    }
  }

  return reminded;
}

export function startHabitWorker() {
  void processHabitReminders();
  return scheduleInTimezone("*/30 * * * *", () => void processHabitReminders());
}