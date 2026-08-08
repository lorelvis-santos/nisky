import { DateTime } from "luxon";

export type RepeatType = "DAILY" | "WEEKLY" | "MONTHLY";

export function nextOccurrence(
  triggerAt: Date,
  timezone: string,
  repeatType: RepeatType,
  interval: number,
  days: number[],
  dayOfMonth: number | null,
) {
  const local = DateTime.fromJSDate(triggerAt, { zone: timezone });
  if (!local.isValid) return new Date(triggerAt.getTime() + interval * 86_400_000);
  if (repeatType === "DAILY") {
    return local.plus({ days: interval }).toJSDate();
  }
  if (repeatType === "MONTHLY") {
    const requestedDay = dayOfMonth ?? local.day;
    const nextMonth = local.plus({ months: interval }).startOf("month");
    return nextMonth.set({ day: Math.min(requestedDay, nextMonth.daysInMonth) }).toJSDate();
  }

  const normalizedDays = [...new Set(days)].sort((a, b) => a - b);
  if (normalizedDays.length === 0) {
    return local.plus({ weeks: interval }).toJSDate();
  }
  const currentDay = local.weekday % 7;
  const upcoming = normalizedDays.find((day) => day > currentDay);
  const daysUntil = upcoming === undefined ? normalizedDays[0]! + 7 - currentDay : upcoming - currentDay;
  const extraWeeks = upcoming === undefined ? interval - 1 : 0;
  return local.plus({ days: daysUntil, weeks: extraWeeks }).toJSDate();
}

export function mondayInTz(date: Date, timezone: string): Date {
  const local = DateTime.fromJSDate(date, { zone: timezone });
  return local.startOf("week").toJSDate();
}

export function weeksBetween(a: Date, b: Date, timezone: string): number {
  const ms = mondayInTz(b, timezone).getTime() - mondayInTz(a, timezone).getTime();
  return Math.floor(ms / (7 * 86_400_000));
}
