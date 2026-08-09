"use client";

import { useEffect } from "react";
import { Plus, X } from "lucide-react";
import type { Task } from "@/types/entities";
import { dateKey } from "@/lib/tasks";
import { cn } from "@/lib/utils";
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

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-[60] flex items-center justify-center bg-on-surface/20 p-4 backdrop-blur-[1px]"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      role="dialog"
    >
      <div className="flex max-h-[90vh] w-full max-w-lg flex-col border border-outline-variant bg-surface shadow-none">
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-outline-variant bg-surface-bright px-5 py-4">
          <h2
            className={cn(
              "font-headline-xs text-headline-xs uppercase",
              isToday ? "font-bold text-primary" : "font-bold text-on-surface",
            )}
          >
            {isToday ? `Hoy · ${dayLabel(day)}` : dayLabel(day)}
            <span className="ml-2 font-data-mono text-data-mono text-xs font-normal normal-case text-on-surface-variant">
              {tasks.length} {tasks.length === 1 ? "tarea" : "tareas"}
            </span>
          </h2>
          <div className="flex items-center gap-2">
            <button
              aria-label={`Crear tarea para ${dayLabel(day)}`}
              className="flex items-center gap-1 border border-outline-variant px-2.5 py-1.5 font-body-sm text-body-sm text-primary hover:bg-surface-container-high"
              onClick={onCreate}
              type="button"
            >
              <Plus size={14} /> Crear
            </button>
            <button
              aria-label="Cerrar"
              className="text-on-surface-variant hover:text-on-surface"
              onClick={onClose}
              type="button"
            >
              <X size={19} />
            </button>
          </div>
        </div>
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
      </div>
    </div>
  );
}