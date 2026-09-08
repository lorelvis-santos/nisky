"use client";

import Link from "next/link";
import { ArrowUpRight, X } from "lucide-react";
import type { Task, TaskStatus } from "@/types/entities";
import { isLegacyNoonDate } from "@/lib/utils";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { parseDateOnly } from "../lib/time";

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

function taskDueTime(task: Task) {
  if (!task.dueDate) return "Sin fecha límite";
  const date = new Date(task.dueDate);
  const endOfDay = (date.getHours() === 23 && date.getMinutes() === 59) || isLegacyNoonDate(task.dueDate);
  if (endOfDay) return "Final del día";
  return `Vence a las ${date.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })}`;
}

export function AgendaDayTasksDialog({
  date,
  tasks,
  onClose,
}: {
  date: string;
  tasks: Task[];
  onClose: () => void;
}) {
  const ordered = [...tasks].sort(
    (a, b) => (a.dueDate ?? "").localeCompare(b.dueDate ?? "") || a.order - b.order || a.title.localeCompare(b.title),
  );

  return (
    <Dialog open onOpenChange={(nextOpen) => { if (!nextOpen) onClose(); }}>
      <DialogContent className="fixed bottom-0 left-0 right-0 top-auto flex h-[min(92dvh,48rem)] max-h-[92dvh] w-full max-w-none translate-x-0 translate-y-0 flex-col gap-0 overflow-hidden rounded-t-2xl border-outline-variant bg-surface p-0 sm:bottom-0 sm:left-auto sm:right-0 sm:top-0 sm:h-full sm:max-h-none sm:w-[min(32rem,100vw)] sm:translate-x-0 sm:translate-y-0 sm:rounded-l-2xl sm:rounded-r-none" data-keyboard-sheet showCloseButton={false}>
        <DialogHeader className="flex shrink-0 flex-row items-center justify-between border-b border-outline-variant bg-surface-bright px-5 py-4 text-left">
          <div className="min-w-0 flex-1">
            <DialogTitle className="font-headline-xs text-headline-xs font-bold normal-case tracking-normal text-primary">
              Tareas del {formatDay(date)}
            </DialogTitle>
            <DialogDescription className="mt-1 font-body-sm text-body-sm text-on-surface-variant">
              {tasks.length} {tasks.length === 1 ? "tarea vence este día" : "tareas vencen este día"}
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
            {ordered.map((task) => {
              const project = task.project?.name;

              return (
                <Link
                  className="group block rounded-lg border border-outline-variant bg-surface-container-lowest p-3 transition-colors hover:border-primary/50 hover:bg-surface-container-low"
                  href={`/tasks?taskId=${encodeURIComponent(task.id)}`}
                  key={task.id}
                  onClick={onClose}
                >
                  <div className="flex items-start gap-3">
                    <span
                      aria-hidden="true"
                      className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${task.status === "COMPLETED" ? "bg-tertiary" : task.status === "IN_PROGRESS" ? "bg-primary" : "bg-outline"}`}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-body-md text-body-md font-semibold text-on-surface group-hover:text-primary">
                        {task.title}
                      </p>
                      <p className="mt-1 truncate font-data-mono text-data-mono text-[11px] text-on-surface-variant">
                        {taskDueTime(task)}{project ? ` · ${project}` : ""}
                      </p>
                    </div>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 font-label-caps text-[10px] uppercase ${STATUS_STYLES[task.status]}`}>
                      {STATUS_LABELS[task.status]}
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
