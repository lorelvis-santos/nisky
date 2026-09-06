"use client";

import { Bell, CalendarDays, CheckCircle2, Clock3, PauseCircle, Pencil, Repeat2 } from "lucide-react";
import type { Project, TimeBlock } from "@/types/entities";
import { PreviewSheet } from "@/components/ui/PreviewSheet";
import { DAY_NAMES, DAY_ORDER, minToTime, parseDateOnly } from "../lib/time";

function blockDate(value: string | Date) {
  const date = typeof value === "string" ? parseDateOnly(value) : value;
  return date.toLocaleDateString("es-DO", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

function reminderLabel(minutes: number) {
  if (minutes === 0) return "Sin aviso previo";
  if (minutes < 60) return `${minutes} minutos antes`;
  if (minutes % 60 === 0) return `${minutes / 60} ${minutes === 60 ? "hora" : "horas"} antes`;
  return `${minutes} minutos antes`;
}

export function TimeBlockPreviewModal({
  block,
  project,
  occurrenceDate,
  onClose,
  onEdit,
}: {
  block: TimeBlock;
  project?: Project | null;
  occurrenceDate?: Date;
  onClose: () => void;
  onEdit: () => void;
}) {
  const title = block.name ?? project?.name ?? "Tiempo libre";
  const days = block.date
    ? blockDate(block.date)
    : block.daysOfWeek.slice().sort((a, b) => DAY_ORDER.indexOf(a) - DAY_ORDER.indexOf(b)).map((day) => DAY_NAMES[day]).join(", ");

  return (
    <PreviewSheet
      eyebrow="Bloque de tiempo"
      footer={
        <button className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-primary px-3.5 font-label-md text-label-md font-semibold text-on-primary hover:bg-primary-container hover:text-on-primary-container" onClick={onEdit} type="button">
          <Pencil size={15} /> Editar bloque
        </button>
      }
      onClose={onClose}
      title={title}
    >
      <div className="space-y-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-label-md text-label-md font-semibold ${block.isActive ? "bg-secondary-container text-on-secondary-container" : "bg-surface-container text-on-surface-variant"}`}>
            {block.isActive ? <CheckCircle2 size={13} /> : <PauseCircle size={13} />}
            {block.isActive ? "Activo" : "Pausado"}
          </span>
          {project && <span className="rounded-full bg-surface-container px-2.5 py-1 font-label-md text-label-md text-on-surface-variant">{project.name}</span>}
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <div className="flex items-start gap-3 rounded-xl bg-surface-container-low px-3 py-3"><Clock3 className="mt-0.5 shrink-0 text-on-surface-variant" size={16} /><div><p className="font-label-caps text-label-caps uppercase text-on-surface-variant">Horario</p><p className="mt-1 font-body-sm text-body-sm text-on-surface">{minToTime(block.startMin)} – {minToTime(block.endMin)}</p></div></div>
          <div className="flex items-start gap-3 rounded-xl bg-surface-container-low px-3 py-3"><CalendarDays className="mt-0.5 shrink-0 text-on-surface-variant" size={16} /><div><p className="font-label-caps text-label-caps uppercase text-on-surface-variant">Días</p><p className="mt-1 capitalize font-body-sm text-body-sm text-on-surface">{days}</p></div></div>
          <div className="flex items-start gap-3 rounded-xl bg-surface-container-low px-3 py-3"><Bell className="mt-0.5 shrink-0 text-on-surface-variant" size={16} /><div><p className="font-label-caps text-label-caps uppercase text-on-surface-variant">Recordatorio</p><p className="mt-1 font-body-sm text-body-sm text-on-surface">{reminderLabel(block.remindBeforeMin)}</p></div></div>
          {occurrenceDate && <div className="flex items-start gap-3 rounded-xl bg-surface-container-low px-3 py-3"><CalendarDays className="mt-0.5 shrink-0 text-on-surface-variant" size={16} /><div><p className="font-label-caps text-label-caps uppercase text-on-surface-variant">Ocurrencia</p><p className="mt-1 capitalize font-body-sm text-body-sm text-on-surface">{blockDate(occurrenceDate)}</p></div></div>}
        </div>
        {!block.date && (
          <p className="flex items-center gap-2 border-t border-outline-variant pt-4 font-body-sm text-body-sm text-on-surface-variant">
            <Repeat2 size={15} /> Cada {block.repeatEveryWeeks === 1 ? "semana" : `${block.repeatEveryWeeks} semanas`}{block.repeatEndsAt ? ` · hasta ${blockDate(block.repeatEndsAt)}` : ""}
          </p>
        )}
      </div>
    </PreviewSheet>
  );
}
