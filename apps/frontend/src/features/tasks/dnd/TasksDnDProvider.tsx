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
  orderedIdsForContainer: (containerId: string) => string[];
  displayContainerOf: (taskId: string) => string;
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

class MousePointerSensor extends PointerSensor {
  static activators = [
    {
      eventName: "onPointerDown" as const,
      handler: ({ nativeEvent: event }: { nativeEvent: PointerEvent }) => {
        if (event.pointerType !== "mouse") return false;
        if (!event.isPrimary || event.button !== 0) return false;
        return true;
      },
    },
  ];
}

export function TasksDnDProvider({
  tasks,
  dayOrder,
  backlogOrder,
  pendingPlacement,
  onMoveTask,
  onReorder,
  onDragStateChange,
  children,
}: {
  tasks: Task[];
  dayOrder: Record<string, string[]>;
  backlogOrder: string[];
  pendingPlacement: Record<string, string>;
  onMoveTask: (taskId: string, dueDate: string | null) => void | Promise<void>;
  onReorder: (containerId: string, taskIds: string[]) => void | Promise<void>;
  onDragStateChange: (dragging: boolean) => void;
  children: React.ReactNode;
}) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overContainerId, setOverContainerId] = useState<string | null>(null);
  const [workingDayOrder, setWorkingDayOrder] = useState(dayOrder);
  const [workingBacklogOrder, setWorkingBacklogOrder] = useState(backlogOrder);
  const [workingPlacement, setWorkingPlacement] = useState(pendingPlacement);
  const [prevOrderProps, setPrevOrderProps] = useState({ dayOrder, backlogOrder, pendingPlacement });
  const [prevActiveId, setPrevActiveId] = useState<string | null>(null);

  if (
    activeId === null &&
    (prevActiveId !== null ||
      prevOrderProps.dayOrder !== dayOrder ||
      prevOrderProps.backlogOrder !== backlogOrder ||
      prevOrderProps.pendingPlacement !== pendingPlacement)
  ) {
    setPrevOrderProps({ dayOrder, backlogOrder, pendingPlacement });
    setPrevActiveId(activeId);
    setWorkingDayOrder(dayOrder);
    setWorkingBacklogOrder(backlogOrder);
    setWorkingPlacement(pendingPlacement);
  }

  const sensors = useSensors(
    useSensor(MousePointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 120, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const activeTask = useMemo(
    () => (activeId ? findTask(tasks, taskIdFromDragId(activeId)) : null),
    [activeId, tasks],
  );

  const displayContainerOf = useCallback(
    (taskId: string): string => {
      if (taskId === activeId) {
        const task = findTask(tasks, taskId);
        return task ? containerOf(task) : BACKLOG_CONTAINER;
      }
      const task = findTask(tasks, taskId);
      if (!task) return BACKLOG_CONTAINER;
      const placement = workingPlacement[taskId];
      return placement && placement !== containerOf(task) ? placement : containerOf(task);
    },
    [activeId, tasks, workingPlacement],
  );

  const orderedIdsForContainer = useCallback(
    (containerId: string): string[] => {
      const members = tasks
        .filter((task) => displayContainerOf(task.id) === containerId)
        .sort((a, b) => a.order - b.order || a.createdAt.localeCompare(b.createdAt));
      if (containerId === BACKLOG_CONTAINER) {
        const existing = workingBacklogOrder.filter((id) => members.some((task) => task.id === id));
        return [...existing, ...members.filter((task) => !existing.includes(task.id)).map((task) => task.id)];
      }
      const dayKey = dayKeyFromContainerId(containerId);
      const existing = (workingDayOrder[dayKey] ?? []).filter((id) => members.some((task) => task.id === id));
      return [...existing, ...members.filter((task) => !existing.includes(task.id)).map((task) => task.id)];
    },
    [displayContainerOf, tasks, workingBacklogOrder, workingDayOrder],
  );

  const moveActiveInOrder = useCallback(
    (containerId: string, overTaskId: string | null, activeTaskId: string): string[] => {
      const current = orderedIdsForContainer(containerId);
      let targetIndex = current.length;
      if (overTaskId && overTaskId !== activeTaskId) {
        const index = current.indexOf(overTaskId);
        if (index >= 0) targetIndex = index;
      }
      const withoutActive = current.filter((id) => id !== activeTaskId);
      withoutActive.splice(Math.min(targetIndex, withoutActive.length), 0, activeTaskId);
      return withoutActive;
    },
    [orderedIdsForContainer],
  );

  const setContainerOrder = useCallback((containerId: string, taskIds: string[]) => {
    if (containerId === BACKLOG_CONTAINER) {
      setWorkingBacklogOrder(taskIds);
      return;
    }
    const dayKey = dayKeyFromContainerId(containerId);
    setWorkingDayOrder((current) => ({ ...current, [dayKey]: taskIds }));
  }, []);

  const isContainerId = useCallback((id: string) => id.startsWith(DAY_PREFIX) || id === BACKLOG_CONTAINER, []);

  const resolveContainerId = useCallback(
    (id: string): string | null => {
      if (id.startsWith("task:")) return displayContainerOf(taskIdFromDragId(id));
      if (isContainerId(id)) return id;
      return null;
    },
    [displayContainerOf, isContainerId],
  );

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      setActiveId(String(event.active.id));
      setOverContainerId(null);
      onDragStateChange(true);
    },
    [onDragStateChange],
  );

  const handleDragOver = useCallback(
    (event: DragMoveEvent) => {
      const over = event.over;
      setOverContainerId(over ? resolveContainerId(String(over.id)) : null);
      if (!over) return;
      const overId = String(over.id);
      if (overId === String(event.active.id)) return;
      const activeTaskId = taskIdFromDragId(String(event.active.id));
      const activeTask = findTask(tasks, activeTaskId);
      if (!activeTask) return;

      const currentContainer = displayContainerOf(activeTaskId);
      let targetContainer: string;
      let overTaskId: string | null = null;
      if (isContainerId(overId)) {
        targetContainer = overId;
      } else {
        const overTask = findTask(tasks, taskIdFromDragId(overId));
        if (!overTask) return;
        targetContainer = displayContainerOf(overTask.id);
        overTaskId = overTask.id;
      }

      if (targetContainer === currentContainer) {
        if (overTaskId == null) return;
        setContainerOrder(targetContainer, moveActiveInOrder(targetContainer, overTaskId, activeTaskId));
        return;
      }

      setWorkingPlacement((current) => ({ ...current, [activeTaskId]: targetContainer }));
      setContainerOrder(targetContainer, moveActiveInOrder(targetContainer, overTaskId, activeTaskId));
    },
    [displayContainerOf, isContainerId, moveActiveInOrder, resolveContainerId, setContainerOrder, tasks],
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const over = event.over;
      const activeTaskId = taskIdFromDragId(String(event.active.id));
      const activeTask = findTask(tasks, activeTaskId);
      setActiveId(null);
      setOverContainerId(null);
      onDragStateChange(false);
      if (!over || !activeTask) return;
      const overId = String(over.id);
      if (overId === String(event.active.id)) return;

      const overIsContainer = isContainerId(overId);
      const overTask = overIsContainer ? null : findTask(tasks, taskIdFromDragId(overId));
      if (!overIsContainer && !overTask) return;

      const sourceContainer = containerOf(activeTask);
      const targetContainer = overIsContainer
        ? overId
        : displayContainerOf(overTask!.id);
      const finalIds = moveActiveInOrder(targetContainer, overIsContainer ? null : overTask!.id, activeTaskId);

      if (sourceContainer === targetContainer) {
        if (overIsContainer) return;
        const current = orderedIdsForContainer(targetContainer);
        if (current.length === finalIds.length && current.every((id, index) => id === finalIds[index])) return;
        void onReorder(targetContainer, finalIds);
        return;
      }
      const targetDueDate = targetContainer === BACKLOG_CONTAINER ? null : dayKeyFromContainerId(targetContainer);
      void onMoveTask(activeTaskId, targetDueDate);
      void onReorder(targetContainer, finalIds);
    },
    [displayContainerOf, isContainerId, moveActiveInOrder, onDragStateChange, onMoveTask, onReorder, orderedIdsForContainer, tasks],
  );

  const handleDragCancel = useCallback(() => {
    setActiveId(null);
    setOverContainerId(null);
    onDragStateChange(false);
  }, [onDragStateChange]);

  const contextValue = useMemo<TasksDnDContextValue>(
    () => ({ activeTask, displayContainerOf, orderedIdsForContainer, overContainerId }),
    [activeTask, displayContainerOf, orderedIdsForContainer, overContainerId],
  );

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
