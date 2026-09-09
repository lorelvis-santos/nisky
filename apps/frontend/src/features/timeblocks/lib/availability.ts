import type { CalendarEvent, TimeBlock } from "@/types/entities";

type SlotEvent = Pick<CalendarEvent, "date" | "allDay" | "startMin" | "endMin">;
type SlotBlock = Pick<TimeBlock, "date" | "daysOfWeek" | "startMin" | "endMin" | "repeatEndsAt">;

function dateOnly(value: string | null) {
  return value?.slice(0, 10) ?? "";
}

function overlaps(startMin: number, endMin: number, otherStartMin: number, otherEndMin: number) {
  return otherStartMin < endMin && otherEndMin > startMin;
}

function blockOccursOn(block: SlotBlock, dateKey: string, dayOfWeek: number) {
  if (block.date) return dateOnly(block.date) === dateKey && block.daysOfWeek.includes(dayOfWeek);
  if (!block.daysOfWeek.includes(dayOfWeek)) return false;
  return !block.repeatEndsAt || dateOnly(block.repeatEndsAt) >= dateKey;
}

export function findAvailableStartMin({
  blocks,
  dateKey,
  dayOfWeek,
  durationMin = 60,
  events,
  preferredStartMin,
}: {
  blocks: SlotBlock[];
  dateKey: string;
  dayOfWeek: number;
  durationMin?: number;
  events: SlotEvent[];
  preferredStartMin: number;
}) {
  const maxStartMin = 24 * 60 - durationMin;

  for (let offsetMin = 0; offsetMin < 24 * 60; offsetMin += 15) {
    const startMin = (preferredStartMin + offsetMin) % (24 * 60);
    const endMin = startMin + durationMin;
    if (startMin > maxStartMin) continue;

    const eventConflict = events.some((event) => {
      if (dateOnly(event.date) !== dateKey || event.allDay || event.startMin === null || event.endMin === null) return false;
      return overlaps(startMin, endMin, event.startMin, event.endMin);
    });
    if (eventConflict) continue;

    const blockConflict = blocks.some((block) =>
      blockOccursOn(block, dateKey, dayOfWeek) && overlaps(startMin, endMin, block.startMin, block.endMin),
    );
    if (!blockConflict) return startMin;
  }

  return null;
}
