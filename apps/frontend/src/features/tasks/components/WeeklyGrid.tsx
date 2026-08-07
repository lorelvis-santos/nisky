"use client";

import { useEffect, useRef } from "react";
import type { Task } from "@/types/entities";
import { dateKey } from "@/lib/tasks";
import { cn } from "@/lib/utils";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { SortableTaskCard } from "./TaskCard";
import { DroppableColumn } from "../dnd/DroppableColumn";
import { dayContainerId, taskDragId, useTasksDnd } from "../dnd/TasksDnDProvider";

const dayNames = ["LUN", "MAR", "MIÉ", "JUE", "VIE", "SÁB", "DOM"];

export function WeeklyGrid({
  weekStart,
  tasks,
  onOpen,
  onToggle,
  onStartPomodoro,
}: {
  weekStart: Date;
  tasks: Task[];
  onOpen: (task: Task) => void;
  onToggle: (task: Task) => void;
  onStartPomodoro: (task: Task) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const today = dateKey(new Date());
  const { overContainerId } = useTasksDnd();
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(weekStart);
    date.setDate(date.getDate() + index);
    return date;
  });

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
            const dayTasks = tasks
              .filter((task) => task.dueDate && dateKey(task.dueDate) === key)
              .sort((a, b) => a.order - b.order || a.createdAt.localeCompare(b.createdAt));
            const orderedIds = dayTasks.map((task) => taskDragId(task.id));
            const isToday = key === today;
            const isEmpty = dayTasks.length === 0;
            const isHighlight = overContainerId === dayContainerId(key);
            return (
              <div
                className="flex min-h-[480px] min-w-0 flex-col gap-2"
                data-today={isToday ? "true" : undefined}
                key={key}
              >
                <div
                  className={cn(
                    "border-b py-2 text-center font-data-mono text-data-mono text-xs",
                    isToday ? "border-t-2 border-primary bg-secondary-container/40 text-primary" : "border-outline-variant text-on-surface-variant",
                  )}
                >
                  {dayNames[index]} {day.getDate()}
                </div>
                <DroppableColumn
                  className={cn(
                    "flex flex-1 flex-col gap-3 border border-outline-variant bg-surface-container-lowest p-3",
                    isEmpty && isHighlight && "border-2 border-dashed border-primary bg-primary-container/10",
                  )}
                  highlightClassName="border-2 border-dashed border-primary bg-primary-container/10"
                  id={dayContainerId(key)}
                >
                  {isEmpty ? (
                    isHighlight ? (
                      <span className="mt-2 text-center font-body-sm text-body-sm text-primary">Suelta aquí una tarea</span>
                    ) : isToday ? (
                      <span className="mt-2 text-center font-body-sm text-body-sm text-on-surface-variant">Sin tareas para hoy</span>
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
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
