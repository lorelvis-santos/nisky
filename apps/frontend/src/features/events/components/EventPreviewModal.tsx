"use client";

import { CalendarDays, Clock3, MapPin, Pencil, Repeat2 } from "lucide-react";
import type { CalendarEvent } from "@/types/entities";
import { PreviewSheet } from "@/components/ui/PreviewSheet";
import { parseDateOnly, minToTime } from "@/features/timeblocks/lib/time";

const recurrenceLabels = {
  DAILY: "diaria",
  WEEKLY: "semanal",
  MONTHLY: "mensual",
  YEARLY: "anual",
} as const;

function eventDate(value: string) {
  return parseDateOnly(value).toLocaleDateString("es-DO", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

export function EventPreviewModal({
  event,
  onClose,
  onEdit,
}: {
  event: CalendarEvent;
  onClose: () => void;
  onEdit: () => void;
}) {
  const time = event.allDay || event.startMin === null || event.endMin === null
    ? "Todo el día"
    : `${minToTime(event.startMin)} – ${minToTime(event.endMin)}`;

  return (
    <PreviewSheet
      eyebrow="Evento"
      footer={
        <button className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-primary px-3.5 font-label-md text-label-md font-semibold text-on-primary hover:bg-primary-container hover:text-on-primary-container" onClick={onEdit} type="button">
          <Pencil size={15} /> Editar evento
        </button>
      }
      onClose={onClose}
      title={event.title}
    >
      <div className="space-y-5">
        <div className="flex items-center gap-2 rounded-xl bg-surface-container-low px-3 py-3">
          <span aria-hidden="true" className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: event.color ?? "#303e51" }} />
          <span className="font-body-md text-body-md font-semibold text-on-surface">{event.allDay ? "Todo el día" : "Evento con horario"}</span>
        </div>
        <dl className="grid gap-2">
          <div className="flex items-start gap-3 rounded-xl bg-surface-container-low px-3 py-3">
            <CalendarDays className="mt-0.5 shrink-0 text-on-surface-variant" size={16} />
            <div><dt className="font-label-caps text-label-caps uppercase text-on-surface-variant">Fecha</dt><dd className="mt-1 font-body-sm text-body-sm capitalize text-on-surface">{eventDate(event.date)}</dd></div>
          </div>
          <div className="flex items-start gap-3 rounded-xl bg-surface-container-low px-3 py-3">
            <Clock3 className="mt-0.5 shrink-0 text-on-surface-variant" size={16} />
            <div><dt className="font-label-caps text-label-caps uppercase text-on-surface-variant">Horario</dt><dd className="mt-1 font-body-sm text-body-sm text-on-surface">{time}</dd></div>
          </div>
          {event.location && (
            <div className="flex items-start gap-3 rounded-xl bg-surface-container-low px-3 py-3">
              <MapPin className="mt-0.5 shrink-0 text-on-surface-variant" size={16} />
              <div><dt className="font-label-caps text-label-caps uppercase text-on-surface-variant">Ubicación</dt><dd className="mt-1 break-words font-body-sm text-body-sm text-on-surface">{event.location}</dd></div>
            </div>
          )}
        </dl>
        {event.recurrenceType && (
          <p className="flex items-center gap-2 border-t border-outline-variant pt-4 font-body-sm text-body-sm text-on-surface-variant">
            <Repeat2 size={15} /> Repetición {recurrenceLabels[event.recurrenceType]}{event.recurrenceInterval > 1 ? ` · cada ${event.recurrenceInterval}` : ""}
          </p>
        )}
      </div>
    </PreviewSheet>
  );
}
