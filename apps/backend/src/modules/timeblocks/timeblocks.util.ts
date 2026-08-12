import { DateTime } from "luxon";
import { mondayInTz, weeksBetween } from "../../utils/recurrence";

export const TIME_BLOCKS_TZ = "America/Santo_Domingo";

export function nowMinutes(now: Date = new Date(), zone = TIME_BLOCKS_TZ): number {
  const local = DateTime.fromJSDate(now, { zone });
  return local.hour * 60 + local.minute;
}

export function dayOfWeek(now: Date = new Date(), zone = TIME_BLOCKS_TZ): number {
  const local = DateTime.fromJSDate(now, { zone });
  return local.weekday % 7;
}

export interface TimeBlockOccurrence {
  createdAt: Date;
  daysOfWeek: number[];
  repeatEveryWeeks: number;
  repeatEndsAt: Date | null;
}

export function blockOccursOn(block: TimeBlockOccurrence, date: Date = new Date(), zone = TIME_BLOCKS_TZ): boolean {
  if (!block.daysOfWeek.includes(dayOfWeek(date, zone))) return false;
  if (block.repeatEndsAt && mondayInTz(date, zone) > mondayInTz(block.repeatEndsAt, zone)) return false;
  if (block.repeatEveryWeeks > 1) {
    const weeks = weeksBetween(block.createdAt, date, zone);
    if (weeks % block.repeatEveryWeeks !== 0) return false;
  }
  return true;
}