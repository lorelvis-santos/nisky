"use client";

import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCorners,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import type { DragEndEvent, DragMoveEvent, DragStartEvent } from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { Task } from "@/types/entities";
import { dateKey } from "@/lib/tasks";
import { BacklogItemGhost, TaskCardGhost } from "./ghosts";

export const BACKLOG_CONTAINER = "backlog";
const DAY_PREFIX = "day:";

export function dayContainerId(dayKey: string) {
  return `${DAY_PREFIX}${dayKey}`;
}

export function dayKeyFromContainerId(id: string) {
  return id.slice(DAY_PREFIX.length);
}

export function taskDragId(taskId: string) {
  return `task:${taskId}`;
}

export function taskIdFromDragId(dragId: string) {
  return dragId.startsWith("task:") ? dragId.slice("task:".length) : "";
}

type TasksDnDContextValue = {
  activeTask: Task | null;
  overContainerId: string | null;
};

const TasksDnDContext = createContext<TasksDnDContextValue | null>(null);

export function useTasksDnd() {
  const value = useContext(TasksDnDContext);
  if (!value) throw new Error("useTasksDnd debe usarse dentro de <TasksDnDProvider>");
  return value;
}

function findTask(tasks: Task[], id: string): Task | null {
  return tasks.find((task) => task.id === id) ?? null;
}

function containerOf(task: Task): string {
  return task.dueDate ? dayContainerId(dateKey(task.dueDate)) : BACKLOG_CONTAINER;
}

export function TasksDnDProvider({
  tasks,
  dayOrder,
  backlogOrder,
  onMoveTask,
  onReorder,
  onDragStateChange,
  children,
}: {
  tasks: Task[];
  dayOrder: Record<string, string[]>;
  backlogOrder: string[];
  onMoveTask: (taskId: string, dueDate: string | null) => void | Promise<void>;
  onReorder: (containerId: string, taskIds: string[]) => void | Promise<void>;
  onDragStateChange: (dragging: boolean) => void;
  children: React.ReactNode;
}) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overContainerId, setOverContainerId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 120, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const activeTask = useMemo(
    () => (activeId ? findTask(tasks, taskIdFromDragId(activeId)) : null),
    [activeId, tasks],
  );

  const orderedIdsForContainer = useCallback(
    (containerId: string): string[] => {
      if (containerId === BACKLOG_CONTAINER) {
        const currentIds = tasks
          .filter((task) => !task.dueDate)
          .sort((a, b) => a.order - b.order || a.createdAt.localeCompare(b.createdAt))
          .map((task) => task.id);
        const existing = backlogOrder.filter((id) => currentIds.includes(id));
        return [...existing, ...currentIds.filter((id) => !existing.includes(id))];
      }
      const dayKey = dayKeyFromContainerId(containerId);
      const currentIds = tasks
        .filter((task) => task.dueDate && dateKey(task.dueDate) === dayKey)
        .sort((a, b) => a.order - b.order || a.createdAt.localeCompare(b.createdAt))
        .map((task) => task.id);
      const existing = (dayOrder[dayKey] ?? []).filter((id) => currentIds.includes(id));
      return [...existing, ...currentIds.filter((id) => !existing.includes(id))];
    },
    [tasks, dayOrder, backlogOrder],
  );

  const resolveContainerId = useCallback(
    (id: string): string | null => {
      if (id.startsWith("task:")) {
        const task = findTask(tasks, taskIdFromDragId(id));
        return task ? containerOf(task) : null;
      }
      if (id.startsWith(DAY_PREFIX) || id === BACKLOG_CONTAINER) return id;
      return null;
    },
    [tasks],
  );

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      setActiveId(String(event.active.id));
      onDragStateChange(true);
    },
    [onDragStateChange],
  );

  const handleDragOver = useCallback(
    (event: DragMoveEvent) => {
      setOverContainerId(event.over ? resolveContainerId(String(event.over.id)) : null);
    },
    [resolveContainerId],
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveId(null);
      setOverContainerId(null);
      onDragStateChange(false);
      const over = event.over;
      if (!over) return;
      const overId = String(over.id);
      if (overId === String(event.active.id)) return;
      const activeTaskId = taskIdFromDragId(String(event.active.id));
      const activeTask = findTask(tasks, activeTaskId);
      if (!activeTask) return;
      const sourceContainer = containerOf(activeTask);
      const targetContainer = resolveContainerId(overId) ?? sourceContainer;
      const overIsItem = overId.startsWith("task:");
      const overTask = overIsItem ? findTask(tasks, taskIdFromDragId(overId)) : null;

      let targetIndex: number | null = null;
      if (overIsItem && overTask) {
        const ids = orderedIdsForContainer(containerOf(overTask));
        targetIndex = Math.max(0, ids.indexOf(overTask.id));
      }

      const buildOrder = (containerId: string) => {
        const ids = orderedIdsForContainer(containerId).filter((id) => id !== activeTaskId);
        if (targetIndex != null) ids.splice(Math.min(targetIndex, ids.length), 0, activeTaskId);
        return ids;
      };

      if (sourceContainer === targetContainer) {
        if (targetIndex == null || !overIsItem) return;
        void onReorder(sourceContainer, buildOrder(sourceContainer));
        return;
      }
      const targetDueDate = targetContainer === BACKLOG_CONTAINER ? null : dayKeyFromContainerId(targetContainer);
      void onMoveTask(activeTaskId, targetDueDate);
      if (targetIndex != null) void onReorder(targetContainer, buildOrder(targetContainer));
    },
    [onDragStateChange, onMoveTask, onReorder, orderedIdsForContainer, resolveContainerId, tasks],
  );

  const handleDragCancel = useCallback(() => {
    setActiveId(null);
    setOverContainerId(null);
    onDragStateChange(false);
  }, [onDragStateChange]);

  const contextValue = useMemo<TasksDnDContextValue>(() => ({ activeTask, overContainerId }), [activeTask, overContainerId]);

  return (
    <DndContext
      collisionDetection={closestCorners}
      onDragCancel={handleDragCancel}
      onDragEnd={handleDragEnd}
      onDragOver={handleDragOver}
      onDragStart={handleDragStart}
      sensors={sensors}
    >
      <TasksDnDContext.Provider value={contextValue}>{children}</TasksDnDContext.Provider>
      <DragOverlay dropAnimation={null}>
        {activeTask ? (activeTask.dueDate ? <TaskCardGhost task={activeTask} /> : <BacklogItemGhost task={activeTask} />) : null}
      </DragOverlay>
    </DndContext>
  );
}
