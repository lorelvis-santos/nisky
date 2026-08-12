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
  id: string;
  startMin: number;
  endMin: number;
  createdAt: Date;
  daysOfWeek: number[];
  repeatEveryWeeks: number;
  repeatEndsAt: Date | null;
}

export type TimeBlockExceptionRow = {
  id: string;
  blockId: string;
  action: "skip" | "move" | string;
  startMin: number | null;
  endMin: number | null;
  date: Date;
};

export type BlockOccurrence = {
  occurs: true;
  startMin: number;
  endMin: number;
  exceptionId: string | null;
} | { occurs: false };

export function blockOccurrenceOn(
  block: TimeBlockOccurrence,
  date: Date = new Date(),
  exceptions: TimeBlockExceptionRow[] = [],
  zone = TIME_BLOCKS_TZ,
): BlockOccurrence {
  if (!block.daysOfWeek.includes(dayOfWeek(date, zone))) return { occurs: false };
  if (block.repeatEndsAt && mondayInTz(date, zone) > mondayInTz(block.repeatEndsAt, zone)) return { occurs: false };
  if (block.repeatEveryWeeks > 1) {
    const weeks = weeksBetween(block.createdAt, date, zone);
    if (weeks % block.repeatEveryWeeks !== 0) return { occurs: false };
  }

  const exception = exceptions.find(e => e.blockId === block.id && e.date.getTime() === date.getTime());
  
  if (exception) {
    if (exception.action === "skip") return { occurs: false };
    if (exception.action === "move" && exception.startMin !== null && exception.endMin !== null) {
      return { occurs: true, startMin: exception.startMin, endMin: exception.endMin, exceptionId: exception.id };
    }
  }

  return { occurs: true, startMin: block.startMin, endMin: block.endMin, exceptionId: null };
}