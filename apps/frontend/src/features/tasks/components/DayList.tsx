"use client";

import { Plus } from "lucide-react";
import type { Task } from "@/types/entities";
import { dateKey } from "@/lib/tasks";
import { useTouchTaskDrag } from "../hooks/useTouchTaskDrag";
import { TaskCard } from "./TaskCard";

const dayNames = ["LUN", "MAR", "MIÉ", "JUE", "VIE", "SÁB", "DOM"];

function dayLabel(day: Date) {
  const index = day.getDay() === 0 ? 6 : day.getDay() - 1;
  return `${dayNames[index]} ${day.getDate()} ${day.toLocaleDateString("es-CO", { month: "short" })}`;
}

export function DayList({
  weekStart,
  tasks,
  dayOrder,
  isDragging,
  onOpen,
  onToggle,
  onMoveTask,
  onReorder,
  onDragStateChange,
  onStartPomodoro,
  onCreateOnDay,
}: {
  weekStart: Date;
  tasks: Task[];
  dayOrder: Record<string, string[]>;
  isDragging: boolean;
  onOpen: (task: Task) => void;
  onToggle: (task: Task) => void;
  onMoveTask: (taskId: string, dueDate: string) => void | Promise<void>;
  onReorder: (dateKey: string, taskIds: string[]) => void;
  onDragStateChange: (dragging: boolean) => void;
  onStartPomodoro: (task: Task) => void;
  onCreateOnDay: (dateKey: string) => void;
}) {
  const today = dateKey(new Date());
  const drag = useTouchTaskDrag({ tasks, dayOrder, onMoveTask, onReorder, onDragStateChange });
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
              <TaskCard
                key={task.id}
                onDragStateChange={onDragStateChange}
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
        const dayTasks = tasks.filter((task) => task.dueDate && dateKey(task.dueDate) === key);
        const taskById = new Map(dayTasks.map((task) => [task.id, task]));
        const orderedTasks = drag
          .orderedIdsFor(key)
          .map((taskId) => taskById.get(taskId))
          .filter((task): task is Task => Boolean(task));
        const isToday = key === today;
        return (
          <section data-day-key={key} key={key} onDragOver={(event) => event.preventDefault()} onDrop={(event) => {
            event.preventDefault();
            const taskId = event.dataTransfer.getData("text/task-id");
            if (!taskId) return;
            const sourceTask = tasks.find((task) => task.id === taskId);
            const sourceKey = sourceTask?.dueDate ? dateKey(sourceTask.dueDate) : "";
            drag.applyDrop(taskId, sourceKey, key, orderedTasks.length);
          }}>
            <header className={`sticky top-0 z-10 flex items-center justify-between border-b px-3 py-2 ${isToday ? "border-t-2 border-t-primary bg-secondary-container text-primary" : "border-outline-variant bg-surface"}`}>
              <span className={`font-data-mono text-data-mono text-xs uppercase ${isToday ? "font-bold" : "text-on-surface-variant"}`}>
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
              {orderedTasks.length === 0 ? (
                isDragging ? (
                  <span className="py-2 text-center font-body-sm text-body-sm text-on-surface-variant">Suelta aquí una tarea</span>
                ) : null
              ) : (
                orderedTasks.map((task, taskIndex) => (
                  <TaskCard
                    key={task.id}
                    isDropTarget={drag.touchDropTarget?.key === key && drag.touchDropTarget.index === taskIndex}
                    onDragHandleDown={drag.handleDragHandleDown}
                    onDragHandleMove={drag.handleDragHandleMove}
                    onDragHandleUp={drag.handleDragHandleUp}
                    onDragStateChange={onDragStateChange}
                    onOpen={() => onOpen(task)}
                    onStartPomodoro={() => onStartPomodoro(task)}
                    onToggle={() => onToggle(task)}
                    task={task}
                  />
                ))
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}
