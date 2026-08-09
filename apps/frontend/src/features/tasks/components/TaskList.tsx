"use client";

import { Plus, Sparkles } from "lucide-react";
import type { Task } from "@/types/entities";
import { dateKey } from "@/lib/tasks";
import { cn } from "@/lib/utils";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { SortableTaskCard, TaskCardShell } from "./TaskCard";
import { DroppableColumn } from "../dnd/DroppableColumn";
import { dayContainerId, taskDragId, useTasksDnd } from "../dnd/TasksDnDProvider";

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
  onCreate,
}: {
  tasks: Task[];
  onOpen: (task: Task) => void;
  onToggle: (task: Task) => void;
  onStartPomodoro: (task: Task) => void;
  onCreateOnDay: (dateKey: string) => void;
  onCreate?: () => void;
}) {
  const today = dateKey(new Date());
  const { overContainerId } = useTasksDnd();
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
        a.order - b.order ||
        a.createdAt.localeCompare(b.createdAt),
    );

  const dayKeys = Array.from(
    new Set(upcomingTasks.map((task) => dateKey(task.dueDate!))),
  );
  if (dayKeys.length > 0 && !dayKeys.includes(today)) dayKeys.unshift(today);

  if (overdueTasks.length === 0 && dayKeys.length === 0) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center px-container-padding pb-4">
        <DroppableColumn
          className={cn(
            "flex w-full max-w-sm flex-col items-center gap-3 border p-8 text-center",
            overContainerId === dayContainerId(today)
              ? "border-2 border-dashed border-primary bg-primary-container/10"
              : "border-outline-variant bg-surface-container-lowest",
          )}
          highlightClassName="border-2 border-dashed border-primary bg-primary-container/10"
          id={dayContainerId(today)}
        >
          {overContainerId === dayContainerId(today) ? (
            <p className="py-2 font-body-sm text-body-sm text-primary">
              Suelta aquí una tarea
            </p>
          ) : (
            <>
              <Sparkles aria-hidden="true" className="text-primary" size={20} />
              <div>
                <p className="font-body-sm text-body-sm text-on-surface">
                  Aún no hay tareas aquí.
                </p>
                <p className="mt-1 font-body-xs text-body-xs text-on-surface-variant">
                  Empieza creando tu primera tarea.
                </p>
              </div>
              {onCreate && (
                <button
                  aria-label="Crear primera tarea"
                  className="flex items-center gap-1.5 bg-primary px-4 py-2 font-body-sm text-body-sm font-bold text-on-primary hover:bg-primary-container hover:text-on-primary-container"
                  onClick={onCreate}
                  type="button"
                >
                  <Plus size={15} /> Crear tarea
                </button>
              )}
            </>
          )}
        </DroppableColumn>
      </div>
    );
  }

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
        const orderedIds = dayTasks.map((task) => taskDragId(task.id));
        const day = new Date(`${key}T00:00:00`);
        const isToday = key === today;
        const isEmpty = dayTasks.length === 0;
        const isHighlight = overContainerId === dayContainerId(key);
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
            <DroppableColumn
              className={cn(
                "flex flex-col gap-3 border bg-surface-container-lowest p-3",
                isEmpty && (isHighlight ? "border-2 border-dashed border-primary bg-primary-container/10" : "border-outline-variant"),
              )}
              highlightClassName="border-2 border-dashed border-primary bg-primary-container/10"
              id={dayContainerId(key)}
            >
              {isEmpty ? (
                isHighlight ? (
                  <span className="py-2 text-center font-body-sm text-body-sm text-primary">Suelta aquí una tarea</span>
                ) : (
                  <span className="py-2 text-center font-body-sm text-body-sm text-on-surface-variant">Sin tareas para este día</span>
                )
              ) : (
                <SortableContext items={orderedIds} strategy={verticalListSortingStrategy}>
                  {dayTasks.map((task) => (
                    <SortableTaskCard
                      key={task.id}
                      onOpen={() => onOpen(task)}
                      onStartPomodoro={() => onStartPomodoro(task)}
                      onToggle={() => onToggle(task)}
                      task={task}
                    />
                  ))}
                </SortableContext>
              )}
            </DroppableColumn>
          </section>
        );
      })}
    </div>
  );
}