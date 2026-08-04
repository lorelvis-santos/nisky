import { useState } from "react";
import type { Task } from "@/types/entities";
import { TaskCard } from "./TaskCard";

const dayNames = ["LUN", "MAR", "MIÉ", "JUE", "VIE", "SÁB", "DOM"];

export function dateKey(date: Date | string) {
  if (typeof date === "string") return date.slice(0, 10);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function taskIdFromDrop(event: React.DragEvent) {
  return event.dataTransfer.getData("text/task-id");
}

export function WeeklyGrid({
  weekStart,
  tasks,
  onOpen,
  onToggle,
  onMoveTask,
  onReorder,
  dayOrder,
  isDragging,
  onDragStateChange,
}: {
  weekStart: Date;
  tasks: Task[];
  onOpen: (task: Task) => void;
  onToggle: (task: Task) => void;
  onMoveTask: (taskId: string, dueDate: string) => void | Promise<void>;
  onReorder: (dateKey: string, taskIds: string[]) => void;
  dayOrder: Record<string, string[]>;
  isDragging: boolean;
  onDragStateChange: (dragging: boolean) => void;
}) {
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  const today = dateKey(new Date());
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(weekStart);
    date.setDate(date.getDate() + index);
    return date;
  });
  return (
    <div className="h-[520px] min-h-[520px] flex-none overflow-auto bg-surface-container-low p-3 lg:h-auto lg:min-h-0 lg:flex-1">
      <div className="grid min-w-[1798px] grid-cols-[repeat(7,minmax(250px,1fr))] gap-2">
        <div className="contents">
          {days.map((day, index) => {
            const key = dateKey(day);
            const dayTasks = tasks.filter(
              (task) => task.dueDate && dateKey(task.dueDate) === key,
            );
            const taskById = new Map(dayTasks.map((task) => [task.id, task]));
            const configuredIds = dayOrder[key] ?? dayTasks.map((task) => task.id);
            const orderedTasks = [
              ...configuredIds.map((taskId) => taskById.get(taskId)).filter((task): task is Task => Boolean(task)),
              ...dayTasks.filter((task) => !configuredIds.includes(task.id)),
            ];
            const reorderAt = (taskId: string, targetIndex: number) => {
              const sourceIndex = orderedTasks.findIndex((task) => task.id === taskId);
              if (sourceIndex < 0 || sourceIndex === targetIndex) return;
              const next = orderedTasks.map((task) => task.id);
              const [moved] = next.splice(sourceIndex, 1);
              next.splice(Math.min(targetIndex, next.length), 0, moved);
              onReorder(key, next);
            };
            const isToday = key === today;
            return (
              <div
                className="flex min-h-[480px] min-w-0 flex-col gap-2"
                key={key}
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                  event.preventDefault();
                  const taskId = taskIdFromDrop(event);
                  setDropTarget(null);
                  if (!taskId) return;
                  const sourceTask = tasks.find((task) => task.id === taskId);
                  if (sourceTask?.dueDate && dateKey(sourceTask.dueDate) === key) {
                    reorderAt(taskId, orderedTasks.length - 1);
                    return;
                  }
                  onMoveTask(taskId, key);
                  onReorder(key, [...orderedTasks.map((task) => task.id), taskId]);
                }}
              >
                <div
                  className={`border-b py-2 text-center font-data-mono text-data-mono text-xs text-on-surface-variant ${isToday ? "border-t-2 border-primary bg-secondary-container/40 text-primary" : "border-outline-variant"}`}
                >
                  {dayNames[index]} {day.getDate()}
                </div>
                <div className="flex flex-1 flex-col gap-3 border border-outline-variant bg-surface-container-lowest p-3">
                  {dayTasks.length === 0 ? (
                    isDragging ? (
                      <span className="mt-2 text-center font-body-sm text-body-sm text-on-surface-variant">
                        Suelta aquí una tarea
                      </span>
                    ) : null
                  ) : (
                    orderedTasks.map((task, taskIndex) => (
                      <TaskCard
                        key={task.id}
                        isDropTarget={dropTarget === `${key}:${taskIndex}`}
                        onDragStateChange={onDragStateChange}
                        onDragOver={() => setDropTarget(`${key}:${taskIndex}`)}
                        onDrop={(event) => {
                          event.stopPropagation();
                          setDropTarget(null);
                          const taskId = taskIdFromDrop(event);
                          if (!taskId || taskId === task.id) return;
                          const sourceTask = tasks.find((item) => item.id === taskId);
                          if (!sourceTask?.dueDate || dateKey(sourceTask.dueDate) !== key) {
                            onMoveTask(taskId, key);
                            onReorder(key, [
                              ...orderedTasks.slice(0, taskIndex).map((item) => item.id),
                              taskId,
                              ...orderedTasks.slice(taskIndex).map((item) => item.id),
                            ]);
                            return;
                          }
                          reorderAt(taskId, taskIndex);
                        }}
                        onOpen={() => onOpen(task)}
                        onToggle={() => onToggle(task)}
                        task={task}
                      />
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
