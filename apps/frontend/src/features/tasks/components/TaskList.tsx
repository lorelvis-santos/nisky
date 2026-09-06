"use client";

import { Plus, Sparkles } from "lucide-react";
import type { Task } from "@/types/entities";
import { dateKey } from "@/lib/tasks";
import { cn } from "@/lib/utils";
import { TaskCardShell } from "./TaskCard";

const dayNames = ["LUN", "MAR", "MIÉ", "JUE", "VIE", "SÁB", "DOM"];

function dayLabel(day: Date) {
  const index = day.getDay() === 0 ? 6 : day.getDay() - 1;
  return `${dayNames[index]} ${day.getDate()} ${day.toLocaleDateString("es-CO", { month: "short" })}`;
}

export function TaskList({
  tasks,
  onOpen,
  onToggle,
  onStartPomodoro,
  onPostponeToday,
  onCreateOnDay,
  onCreate,
}: {
  tasks: Task[];
  onOpen: (task: Task) => void;
  onToggle: (task: Task) => void;
  onStartPomodoro: (task: Task) => void;
  onPostponeToday?: (task: Task) => void;
  onCreateOnDay: (dateKey: string) => void;
  onCreate?: () => void;
}) {
  const today = dateKey(new Date());
  const visibleTasks = tasks;

  const datedTasks = visibleTasks.filter((task) => task.dueDate);
  const overdueTasks = datedTasks
    .filter((task) => dateKey(task.dueDate!) < today)
    .sort((a, b) => (a.dueDate ?? "").localeCompare(b.dueDate ?? "") || a.order - b.order);
  const upcomingTasks = datedTasks
    .filter((task) => dateKey(task.dueDate!) >= today)
    .sort((a, b) => (a.dueDate ?? "").localeCompare(b.dueDate ?? "") || a.order - b.order);
  const dayKeys = Array.from(new Set(upcomingTasks.map((task) => dateKey(task.dueDate!))));

  if (datedTasks.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center py-12">
        <div className="flex w-full max-w-md flex-col items-center gap-3 rounded-2xl bg-surface-container-lowest p-10 text-center shadow-sm">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-container-low text-secondary">
            <Sparkles aria-hidden="true" size={22} />
          </div>
          <div>
            <p className="font-headline-sm text-headline-sm font-semibold text-on-surface">
              No hay tareas en la lista
            </p>
            <p className="mt-1 font-body-sm text-body-sm text-on-surface-variant">
              Todo al día. Puedes crear una tarea nueva o revisar las tareas por organizar.
            </p>
          </div>
          {onCreate && (
            <button
              aria-label="Crear primera tarea"
              className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 font-label-md text-label-md font-semibold text-on-primary hover:bg-surface-container-high hover:text-on-surface"
              onClick={onCreate}
              type="button"
            >
              <Plus size={15} /> Crear tarea
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {overdueTasks.length > 0 && (
        <section className="pt-4">
          <header className="flex items-center justify-between px-1 py-1">
            <div className="flex items-center gap-2">
              <span className="font-label-sm text-label-sm font-semibold uppercase tracking-wider text-error">
                Atrasadas
              </span>
              <span className="rounded-full bg-error-container px-2 py-0.5 font-label-sm text-label-sm text-on-error-container">
                {overdueTasks.length}
              </span>
            </div>
          </header>
          <div className="flex flex-col gap-2">
            {overdueTasks.map((task) => (
              <TaskCardShell
                key={task.id}
                onOpen={() => onOpen(task)}
                onPostponeToday={onPostponeToday ? () => onPostponeToday(task) : undefined}
                onStartPomodoro={() => onStartPomodoro(task)}
                onToggle={() => onToggle(task)}
                task={task}
              />
            ))}
          </div>
        </section>
      )}
      {dayKeys.map((key) => {
        const dayTasks = upcomingTasks.filter((task) => dateKey(task.dueDate!) === key);
        const day = new Date(`${key}T00:00:00`);
        const isToday = key === today;
        return (
          <section className="pt-1" data-day-key={key} key={key}>
            <header className="flex items-center justify-between px-1 py-1">
              <div className="flex items-center gap-2">
                <span className={cn("font-label-sm text-label-sm font-semibold uppercase tracking-wider", isToday ? "text-secondary" : "text-on-surface-variant")}>
                  {isToday ? "Hoy" : dayLabel(day)}
                </span>
                <span className={cn("rounded-full px-2 py-0.5 font-label-sm text-label-sm", isToday ? "bg-surface-container-high text-secondary" : "bg-surface-container text-on-surface-variant")}>
                  {dayTasks.length}
                </span>
              </div>
              <button
                aria-label={`Crear tarea para ${dayLabel(day)}`}
                className="rounded-md p-1 text-on-surface-variant hover:bg-surface-container-low hover:text-primary"
                onClick={() => onCreateOnDay(key)}
                type="button"
              >
                <Plus size={15} />
              </button>
            </header>
            <div className="flex flex-col gap-2">
              {dayTasks.map((task) => (
                <TaskCardShell
                  key={task.id}
                  onOpen={() => onOpen(task)}
                  onStartPomodoro={() => onStartPomodoro(task)}
                  onToggle={() => onToggle(task)}
                  task={task}
                />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
