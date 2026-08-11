import { DateTime } from "luxon";

export interface ScheduledJob {
  stop: () => void;
}

const TZ = "America/Santo_Domingo";

function nextCron(cronExpr: string, from: DateTime): DateTime {
  const parts = cronExpr.split(" ");
  if (parts.length !== 5) throw new Error(`Invalid cron expression: ${cronExpr}`);
  const [minute, hour, dayOfMonth, month, dayOfWeek] = parts as [string, string, string, string, string];

  let candidate = from.startOf("minute").plus({ minutes: 1 });

  while (true) {
    const cHour = candidate.hour;
    const cMinute = candidate.minute;
    const cDay = candidate.day;
    const cMonth = candidate.month;
    const cWeekday = candidate.weekday % 7;

    const matchMinute = minute === "*" || minute.split(",").map(Number).includes(cMinute);
    const matchHour = hour === "*" || hour.split(",").map(Number).includes(cHour);
    const matchDay = dayOfMonth === "*" || dayOfMonth.split(",").map(Number).includes(cDay);
    const matchMonth = month === "*" || month.split(",").map(Number).includes(cMonth);
    const matchWeekday = dayOfWeek === "*" || dayOfWeek.split(",").map(Number).includes(cWeekday);

    if (matchMinute && matchHour && matchDay && matchMonth && matchWeekday) {
      return candidate;
    }
    candidate = candidate.plus({ minutes: 1 });
    if (candidate.diff(from, "days").days > 366) {
      throw new Error("Cron next run not found within a year");
    }
  }
}

export function scheduleInTimezone(cronExpr: string, fn: () => void, zone: string = "America/Santo_Domingo"): ScheduledJob {
  let stopped = false;
  let timeout: ReturnType<typeof setTimeout> | null = null;

  const tick = async () => {
    if (stopped) return;
    const now = DateTime.now().setZone(zone);
    const next = nextCron(cronExpr, now);
    const ms = next.diff(now).milliseconds;
    if (ms <= 0) {
      await fn();
      timeout = setTimeout(tick, 1000);
    } else {
      timeout = setTimeout(() => {
        if (!stopped) {
          fn();
          tick();
        }
      }, ms);
    }
  };

  tick();

  return {
    stop: () => {
      stopped = true;
      if (timeout) clearTimeout(timeout);
    },
  };
}