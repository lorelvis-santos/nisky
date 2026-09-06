"use client";

import type { Task } from "@/types/entities";
import { TaskCardShell } from "./TaskCard";

export function BacklogPanel({
  tasks,
  count,
  onOpen,
  onPlanToday,
  onToggle,
  onStartPomodoro,
}: {
  tasks: Task[];
  count: number;
  onOpen: (task: Task) => void;
  onPlanToday: (task: Task) => void;
  onToggle: (task: Task) => void;
  onStartPomodoro: (task: Task) => void;
}) {
  return (
    <section className="flex flex-col gap-4">
      <header className="flex flex-wrap items-end justify-between gap-2 border-b border-outline-variant pb-3">
        <div>
          <h2 className="font-headline-xs text-headline-xs font-semibold text-on-surface">
            Por organizar
          </h2>
          <p className="mt-1 font-body-sm text-body-sm text-on-surface-variant">
            Sin fecha ni día planificado.
          </p>
        </div>
        <span className="font-data-mono text-data-mono text-[11px] text-on-surface-variant">
          {count} {count === 1 ? "tarea" : "tareas"}
        </span>
      </header>
      {tasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-outline-variant bg-surface-container-lowest px-6 py-12 text-center">
          <p className="font-headline-xs text-headline-xs font-semibold text-on-surface">
            No hay tareas por organizar
          </p>
          <p className="mt-1 max-w-sm font-body-sm text-body-sm text-on-surface-variant">
            Las tareas nuevas sin fecha aparecerán aquí.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {tasks.map((task) => (
            <TaskCardShell
              key={task.id}
              onOpen={() => onOpen(task)}
              onPlanToday={() => onPlanToday(task)}
              onStartPomodoro={() => onStartPomodoro(task)}
              onToggle={() => onToggle(task)}
              task={task}
            />
          ))}
        </div>
      )}
    </section>
  );
}
