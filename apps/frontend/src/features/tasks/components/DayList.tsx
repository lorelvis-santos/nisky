"use client";

import { Plus } from "lucide-react";
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

export function DayList({
  weekStart,
  tasks,
  onOpen,
  onToggle,
  onStartPomodoro,
  onCreateOnDay,
}: {
  weekStart: Date;
  tasks: Task[];
  onOpen: (task: Task) => void;
  onToggle: (task: Task) => void;
  onStartPomodoro: (task: Task) => void;
  onCreateOnDay: (dateKey: string) => void;
}) {
  const today = dateKey(new Date());
  const { overContainerId } = useTasksDnd();
  const weekDays = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(weekStart);
    date.setDate(date.getDate() + index);
    return date;
  });
  const currentWeek = weekDays.some((day) => dateKey(day) === today);

  const overdueTasks = tasks
    .filter((task) => task.status !== "COMPLETED" && task.status !== "CANCELLED" && task.dueDate && dateKey(task.dueDate) < today)
    .sort((a, b) => (a.dueDate ?? "").localeCompare(b.dueDate ?? "") || a.order - b.order);

  const visibleDays = (currentWeek
    ? [weekDays.find((day) => dateKey(day) === today)!, ...weekDays.filter((day) => dateKey(day) > today)]
    : weekDays
  ).filter((day) => {
    const key = dateKey(day);
    return key === today || tasks.some((task) => task.dueDate && dateKey(task.dueDate) === key);
  });

  return (
    <div className="flex-1 space-y-4 p-container-padding">
      {currentWeek && overdueTasks.length > 0 && (
        <section>
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
      {visibleDays.map((day) => {
        const key = dateKey(day);
        const dayTasks = tasks
          .filter((task) => task.dueDate && dateKey(task.dueDate) === key)
          .sort((a, b) => a.order - b.order || a.createdAt.localeCompare(b.createdAt));
        const orderedIds = dayTasks.map((task) => taskDragId(task.id));
        const isToday = key === today;
        const isEmpty = dayTasks.length === 0;
        const isHighlight = overContainerId === dayContainerId(key);
        return (
          <section data-day-key={key} key={key}>
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
                ) : null
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
