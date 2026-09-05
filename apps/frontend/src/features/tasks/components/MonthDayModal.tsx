"use client";

import { Plus, X } from "lucide-react";
import type { Task } from "@/types/entities";
import { dateKey } from "@/lib/tasks";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { TaskCardShell } from "./TaskCard";

const dayNames = ["LUN", "MAR", "MIÉ", "JUE", "VIE", "SÁB", "DOM"];

function dayLabel(day: Date) {
  const index = day.getDay() === 0 ? 6 : day.getDay() - 1;
  return `${dayNames[index]} ${day.getDate()} ${day.toLocaleDateString("es-CO", { month: "short" })}`;
}

export function MonthDayModal({
  dayKey,
  tasks,
  onOpen,
  onToggle,
  onStartPomodoro,
  onCreate,
  onClose,
}: {
  dayKey: string;
  tasks: Task[];
  onOpen: (task: Task) => void;
  onToggle: (task: Task) => void;
  onStartPomodoro: (task: Task) => void;
  onCreate: () => void;
  onClose: () => void;
}) {
  const day = new Date(`${dayKey}T00:00:00`);
  const isToday = dayKey === dateKey(new Date());
  const ordered = [...tasks].sort(
    (a, b) => a.order - b.order || a.createdAt.localeCompare(b.createdAt),
  );

  return (
    <Dialog open onOpenChange={(nextOpen) => { if (!nextOpen) onClose(); }}>
      <DialogContent className="flex max-h-[90vh] w-full max-w-lg flex-col gap-0 overflow-hidden rounded-2xl border-outline-variant bg-surface p-0" showCloseButton={false}>
        <DialogHeader className="flex shrink-0 flex-row items-center justify-between gap-2 border-b border-outline-variant bg-surface-bright px-5 py-4 text-left">
          <DialogTitle
            className={cn(
              "font-headline-xs text-headline-xs uppercase",
              isToday ? "font-bold text-primary" : "font-bold text-on-surface",
            )}
          >
            {isToday ? `Hoy · ${dayLabel(day)}` : dayLabel(day)}
            <span className="ml-2 font-data-mono text-data-mono text-xs font-normal normal-case text-on-surface-variant">
              {tasks.length} {tasks.length === 1 ? "tarea" : "tareas"}
            </span>
          </DialogTitle>
          <DialogDescription className="sr-only">Tareas programadas para este día.</DialogDescription>
          <div className="flex items-center gap-2">
            <button
              aria-label={`Crear tarea para ${dayLabel(day)}`}
              className="flex items-center gap-1 border border-outline-variant px-2.5 py-1.5 font-body-sm text-body-sm text-primary hover:bg-surface-container-high"
              onClick={onCreate}
              type="button"
            >
              <Plus size={14} /> Crear
            </button>
            <DialogClose asChild>
              <button aria-label="Cerrar" className="flex h-10 w-10 items-center justify-center text-on-surface-variant hover:text-on-surface" type="button">
                <X size={19} />
              </button>
            </DialogClose>
          </div>
        </DialogHeader>
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
          {ordered.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-10">
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                Sin tareas este día.
              </p>
              <button
                className="flex items-center gap-1 border border-outline-variant px-3 py-1.5 font-body-sm text-body-sm text-primary hover:bg-surface-container-high"
                onClick={onCreate}
                type="button"
              >
                <Plus size={14} /> Crear tarea
              </button>
            </div>
          ) : (
            ordered.map((task) => (
              <TaskCardShell
                key={task.id}
                onOpen={() => onOpen(task)}
                onStartPomodoro={() => onStartPomodoro(task)}
                onToggle={() => onToggle(task)}
                task={task}
              />
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
