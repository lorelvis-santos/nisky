"use client";

import Link from "next/link";
import { ArrowUpRight, X } from "lucide-react";
import type { TaskSchedule, TaskStatus } from "@/types/entities";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { minToTime, parseDateOnly } from "../lib/time";

const STATUS_LABELS: Record<TaskStatus, string> = {
  PENDING: "Pendiente",
  IN_PROGRESS: "En curso",
  COMPLETED: "Completada",
  CANCELLED: "Cancelada",
};

const STATUS_STYLES: Record<TaskStatus, string> = {
  PENDING: "bg-surface-container-high text-on-surface-variant",
  IN_PROGRESS: "bg-primary-container text-on-primary",
  COMPLETED: "bg-tertiary-container text-tertiary",
  CANCELLED: "bg-error-container text-error",
};

function formatDay(date: string) {
  const label = new Intl.DateTimeFormat("es-CO", {
    day: "numeric",
    month: "long",
    weekday: "long",
  }).format(parseDateOnly(date));
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function scheduleTime(schedule: TaskSchedule) {
  const occurrence = schedule.occurrence;
  if (!occurrence?.occurs) return null;
  return `${minToTime(occurrence.startMin)}–${minToTime(occurrence.endMin)}`;
}

export function AgendaDayTasksDialog({
  date,
  schedules,
  onClose,
}: {
  date: string;
  schedules: TaskSchedule[];
  onClose: () => void;
}) {
  const ordered = [...schedules].sort((a, b) => {
    const aStart = a.occurrence?.occurs ? a.occurrence.startMin : Number.MAX_SAFE_INTEGER;
    const bStart = b.occurrence?.occurs ? b.occurrence.startMin : Number.MAX_SAFE_INTEGER;
    return aStart - bStart || a.order - b.order || a.task.title.localeCompare(b.task.title);
  });

  return (
    <Dialog open onOpenChange={(nextOpen) => { if (!nextOpen) onClose(); }}>
      <DialogContent className="fixed bottom-0 left-0 right-0 top-auto flex h-[min(92dvh,48rem)] max-h-[92dvh] w-full max-w-none translate-x-0 translate-y-0 flex-col gap-0 overflow-hidden rounded-t-2xl border-outline-variant bg-surface p-0 sm:bottom-0 sm:left-auto sm:right-0 sm:top-0 sm:h-full sm:max-h-none sm:w-[min(32rem,100vw)] sm:translate-x-0 sm:translate-y-0 sm:rounded-l-2xl sm:rounded-r-none" data-keyboard-sheet showCloseButton={false}>
        <DialogHeader className="flex shrink-0 flex-row items-center justify-between border-b border-outline-variant bg-surface-bright px-5 py-4 text-left">
          <div className="min-w-0 flex-1">
            <DialogTitle className="font-headline-xs text-headline-xs font-bold normal-case tracking-normal text-primary">
              Tareas del {formatDay(date)}
            </DialogTitle>
            <DialogDescription className="mt-1 font-body-sm text-body-sm text-on-surface-variant">
              {schedules.length} {schedules.length === 1 ? "tarea planificada" : "tareas planificadas"}
            </DialogDescription>
          </div>
          <DialogClose asChild>
            <button
              aria-label="Cerrar"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface"
              type="button"
            >
              <X size={19} />
            </button>
          </DialogClose>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5" data-modal-scroll>
          <div className="space-y-2">
            {ordered.map((schedule) => {
              const time = scheduleTime(schedule);
              const location = schedule.timeBlock?.name ?? "Sin bloque horario";
              const project = schedule.task.project?.name;

              return (
                <Link
                  className="group block rounded-lg border border-outline-variant bg-surface-container-lowest p-3 transition-colors hover:border-primary/50 hover:bg-surface-container-low"
                  href={`/tasks?taskId=${encodeURIComponent(schedule.taskId)}`}
                  key={schedule.id}
                  onClick={onClose}
                >
                  <div className="flex items-start gap-3">
                    <span
                      aria-hidden="true"
                      className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${schedule.task.status === "COMPLETED" ? "bg-tertiary" : schedule.task.status === "IN_PROGRESS" ? "bg-primary" : "bg-outline"}`}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-body-md text-body-md font-semibold text-on-surface group-hover:text-primary">
                        {schedule.task.title}
                      </p>
                      <p className="mt-1 truncate font-data-mono text-data-mono text-[11px] text-on-surface-variant">
                        {location}{time ? ` · ${time}` : ""}{project ? ` · ${project}` : ""}
                      </p>
                    </div>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 font-label-caps text-[10px] uppercase ${STATUS_STYLES[schedule.task.status]}`}>
                      {STATUS_LABELS[schedule.task.status]}
                    </span>
                  </div>
                  <span className="mt-2 flex items-center justify-end gap-1 font-label-md text-[11px] text-primary">
                    Abrir en Tareas
                    <ArrowUpRight aria-hidden="true" size={13} />
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
