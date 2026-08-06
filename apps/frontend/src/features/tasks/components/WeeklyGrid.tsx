import { useEffect, useRef, useState } from "react";
import type { Task } from "@/types/entities";
import { dateKey } from "@/lib/tasks";
import { useTouchTaskDrag } from "../hooks/useTouchTaskDrag";
import { TaskCard } from "./TaskCard";

const dayNames = ["LUN", "MAR", "MIÉ", "JUE", "VIE", "SÁB", "DOM"];

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
  onStartPomodoro,
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
  onStartPomodoro: (task: Task) => void;
}) {
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const today = dateKey(new Date());
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(weekStart);
    date.setDate(date.getDate() + index);
    return date;
  });
  const drag = useTouchTaskDrag({ tasks, dayOrder, onMoveTask, onReorder, onDragStateChange });

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const todayColumn = el.querySelector<HTMLElement>("[data-today='true']");
    if (!todayColumn) return;
    const containerRect = el.getBoundingClientRect();
    const columnRect = todayColumn.getBoundingClientRect();
    const maxScroll = Math.max(el.scrollWidth - el.clientWidth, 0);
    const target = el.scrollLeft + (columnRect.left - containerRect.left) - (el.clientWidth - columnRect.width) / 2;
    el.scrollLeft = Math.min(Math.max(target, 0), maxScroll);
  }, []);

  return (
    <div ref={scrollRef} className="h-[520px] min-h-[520px] flex-none overflow-auto bg-surface-container-low p-3 lg:h-auto lg:min-h-0 lg:flex-1">
      <div className="grid min-w-[1798px] grid-cols-[repeat(7,minmax(250px,1fr))] gap-2">
        <div className="contents">
          {days.map((day, index) => {
            const key = dateKey(day);
            const dayTasks = tasks.filter(
              (task) => task.dueDate && dateKey(task.dueDate) === key,
            );
            const taskById = new Map(dayTasks.map((task) => [task.id, task]));
            const orderedTasks = drag
              .orderedIdsFor(key)
              .map((taskId) => taskById.get(taskId))
              .filter((task): task is Task => Boolean(task));
            const isToday = key === today;
            return (
              <div
                className="flex min-h-[480px] min-w-0 flex-col gap-2"
                data-day-key={key}
                data-today={isToday ? "true" : undefined}
                key={key}
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                  event.preventDefault();
                  const taskId = taskIdFromDrop(event);
                  setDropTarget(null);
                  if (!taskId) return;
                  const sourceTask = tasks.find((task) => task.id === taskId);
                  const sourceKey = sourceTask?.dueDate ? dateKey(sourceTask.dueDate) : "";
                  drag.applyDrop(taskId, sourceKey, key, orderedTasks.length);
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
                        isDropTarget={dropTarget === `${key}:${taskIndex}` || (drag.touchDropTarget?.key === key && drag.touchDropTarget.index === taskIndex)}
                        onDragHandleDown={drag.handleDragHandleDown}
                        onDragHandleMove={drag.handleDragHandleMove}
                        onDragHandleUp={drag.handleDragHandleUp}
                        onDragStateChange={onDragStateChange}
                        onDragOver={() => setDropTarget(`${key}:${taskIndex}`)}
                        onDrop={(event) => {
                          event.stopPropagation();
                          setDropTarget(null);
                          const taskId = taskIdFromDrop(event);
                          if (!taskId || taskId === task.id) return;
                          const sourceTask = tasks.find((item) => item.id === taskId);
                          const sourceKey = sourceTask?.dueDate ? dateKey(sourceTask.dueDate) : "";
                          drag.applyDrop(taskId, sourceKey, key, taskIndex);
                        }}
                        onOpen={() => onOpen(task)}
                        onStartPomodoro={() => onStartPomodoro(task)}
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
