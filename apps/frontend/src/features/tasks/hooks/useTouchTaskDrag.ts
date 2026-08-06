"use client";

import { useRef, useState } from "react";
import { dateKey } from "@/lib/tasks";
import type { Task } from "@/types/entities";

export function useTouchTaskDrag({
  tasks,
  dayOrder,
  onMoveTask,
  onReorder,
  onDragStateChange,
}: {
  tasks: Task[];
  dayOrder: Record<string, string[]>;
  onMoveTask: (taskId: string, dueDate: string) => void | Promise<void>;
  onReorder: (dateKey: string, taskIds: string[]) => void;
  onDragStateChange: (dragging: boolean) => void;
}) {
  const [touchDropTarget, setTouchDropTarget] = useState<{ key: string; index: number } | null>(null);
  const touchDragRef = useRef<{ taskId: string; sourceKey: string; card: HTMLElement | null } | null>(null);
  const touchDropTargetRef = useRef<{ key: string; index: number } | null>(null);

  const orderedIdsFor = (key: string) => {
    const dayTasks = tasks.filter((task) => task.dueDate && dateKey(task.dueDate) === key);
    const taskById = new Map(dayTasks.map((task) => [task.id, task]));
    const configuredIds = dayOrder[key] ?? dayTasks.map((task) => task.id);
    return [
      ...configuredIds.map((taskId) => taskById.get(taskId)).filter((task): task is Task => Boolean(task)).map((task) => task.id),
      ...dayTasks.filter((task) => !configuredIds.includes(task.id)).map((task) => task.id),
    ];
  };

  const applyDrop = (taskId: string, sourceKey: string, targetKey: string, targetIndex: number) => {
    if (sourceKey === targetKey) {
      const ids = orderedIdsFor(targetKey);
      const sourceIndex = ids.indexOf(taskId);
      if (sourceIndex < 0 || sourceIndex === targetIndex) return;
      const next = [...ids];
      const [moved] = next.splice(sourceIndex, 1);
      next.splice(Math.min(targetIndex, next.length), 0, moved);
      onReorder(targetKey, next);
      return;
    }
    onMoveTask(taskId, targetKey);
    onReorder(targetKey, [...orderedIdsFor(targetKey), taskId]);
  };

  const handleDragHandleDown = (event: React.PointerEvent<HTMLButtonElement>, taskId: string) => {
    if (event.pointerType === "mouse") return;
    const task = tasks.find((item) => item.id === taskId);
    const card = event.currentTarget.closest<HTMLElement>("[data-task-card]");
    if (card) card.draggable = false;
    touchDragRef.current = { taskId, sourceKey: task?.dueDate ? dateKey(task.dueDate) : "", card };
    touchDropTargetRef.current = null;
    setTouchDropTarget(null);
    onDragStateChange(true);
    event.currentTarget.setPointerCapture(event.pointerId);
    event.preventDefault();
  };

  const handleDragHandleMove = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (!touchDragRef.current) return;
    const element = document.elementFromPoint(event.clientX, event.clientY);
    const column = (element as HTMLElement | null)?.closest?.("[data-day-key]");
    if (!column) {
      touchDropTargetRef.current = null;
      setTouchDropTarget(null);
      return;
    }
    const key = (column as HTMLElement).dataset.dayKey ?? "";
    const taskId = touchDragRef.current.taskId;
    const cards = Array.from(column.querySelectorAll<HTMLElement>("[data-task-card]")).filter((card) => card.dataset.taskId !== taskId);
    let index = cards.length;
    for (let i = 0; i < cards.length; i += 1) {
      const rect = cards[i].getBoundingClientRect();
      if (event.clientY < rect.top + rect.height / 2) {
        index = i;
        break;
      }
    }
    const next = { key, index };
    touchDropTargetRef.current = next;
    setTouchDropTarget(next);
  };

  const handleDragHandleUp = () => {
    const drag = touchDragRef.current;
    touchDragRef.current = null;
    if (!drag) return;
    if (drag.card) drag.card.draggable = true;
    onDragStateChange(false);
    const target = touchDropTargetRef.current;
    touchDropTargetRef.current = null;
    setTouchDropTarget(null);
    if (target) applyDrop(drag.taskId, drag.sourceKey, target.key, target.index);
  };

  return { touchDropTarget, orderedIdsFor, applyDrop, handleDragHandleDown, handleDragHandleMove, handleDragHandleUp };
}
