"use client";

import { Plus } from "lucide-react";
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
  onCreateOnDay,
}: {
  tasks: Task[];
  onOpen: (task: Task) => void;
  onToggle: (task: Task) => void;
  onStartPomodoro: (task: Task) => void;
  onCreateOnDay: (dateKey: string) => void;
}) {
  const today = dateKey(new Date());
  const incomplete = tasks
    .filter((task) => task.status !== "COMPLETED" && task.status !== "CANCELLED")
    .filter((task) => task.dueDate);
  const complete = tasks
    .filter((task) => task.status === "COMPLETED" || task.status === "CANCELLED")
    .filter((task) => task.dueDate);

  const overdueTasks = incomplete
    .filter((task) => dateKey(task.dueDate!) < today)
    .sort(
      (a, b) =>
        (a.dueDate ?? "").localeCompare(b.dueDate ?? "") || a.order - b.order,
    );

  const upcomingTasks = [...incomplete, ...complete]
    .filter((task) => dateKey(task.dueDate!) >= today)
    .sort(
      (a, b) =>
        (a.dueDate ?? "").localeCompare(b.dueDate ?? "") ||
        a.createdAt.localeCompare(b.createdAt),
    );

  const dayKeys = Array.from(
    new Set(upcomingTasks.map((task) => dateKey(task.dueDate!))),
  );

  return (
    <div className="min-h-0 flex-1 overflow-y-auto px-container-padding pb-4">
      {overdueTasks.length > 0 && (
        <section className="pt-4">
          <header className="sticky top-0 z-10 flex items-center justify-between border-b border-outline-variant border-t-2 border-t-error bg-surface px-3 py-2">
            <span className="font-data-mono text-data-mono text-xs font-bold uppercase text-error">
              Vencidas ({overdueTasks.length})
            </span>
          </header>
          <div className="flex flex-col gap-3 border border-outline-variant bg-surface-container-lowest p-3">
            {overdueTasks.map((task) => (
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
      )}
      {dayKeys.map((key) => {
        const dayTasks = upcomingTasks.filter((task) => dateKey(task.dueDate!) === key);
        const day = new Date(`${key}T00:00:00`);
        const isToday = key === today;
        return (
          <section className="pt-4" data-day-key={key} key={key}>
            <header className={cn("sticky top-0 z-10 flex items-center justify-between border-b px-3 py-2", isToday ? "border-t-2 border-t-primary bg-secondary-container text-primary" : "border-outline-variant bg-surface")}>
              <span className={cn("font-data-mono text-data-mono text-xs uppercase", isToday ? "font-bold" : "text-on-surface-variant")}>
                {isToday ? `HOY · ${dayLabel(day)}` : dayLabel(day)}
              </span>
              <button
                aria-label={`Crear tarea para ${dayLabel(day)}`}
                className="p-1 text-on-surface-variant hover:text-primary"
                onClick={() => onCreateOnDay(key)}
                type="button"
              >
                <Plus size={15} />
              </button>
            </header>
            <div className="flex flex-col gap-3 border border-outline-variant bg-surface-container-lowest p-3">
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