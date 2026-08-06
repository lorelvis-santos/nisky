"use client";

import { CheckSquare2, GripVertical, MoreHorizontal, Play, Timer } from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { DraggableAttributes, DraggableSyntheticListeners } from "@dnd-kit/core";
import type { CSSProperties } from "react";
import type { Task } from "@/types/entities";
import { cn } from "@/lib/utils";
import { PriorityChip } from "./PriorityChip";
import { taskDragId } from "../dnd/TasksDnDProvider";

type DragProps = {
  ref: (node: HTMLElement | null) => void;
  attributes: DraggableAttributes;
  listeners: DraggableSyntheticListeners;
  style?: CSSProperties;
};

export function BacklogItemShell({
  task,
  onOpen,
  onToggle,
  onStartPomodoro,
  dragging = false,
  dropTarget = false,
  dragProps,
}: {
  task: Task;
  onOpen: () => void;
  onToggle: () => void;
  onStartPomodoro?: () => void;
  dragging?: boolean;
  dropTarget?: boolean;
  dragProps?: DragProps;
}) {
  const subtaskTotal = task.subtaskCount ?? task.subtasks?.length ?? 0;
  const completedSubtasks = task.completedSubtasks ?? task.subtasks?.filter((subtask) => subtask.completed).length ?? 0;
  return (
    <>
      <article
        aria-label={`Tarea pendiente: ${task.title}`}
        className={cn(
          "group relative flex min-h-[104px] select-none flex-col gap-2 border bg-surface p-3 transition-colors hover:border-outline",
          dropTarget ? "border-2 border-primary bg-primary-container/20" : "border-outline-variant",
          dragging && "opacity-40",
        )}
        onDoubleClick={onOpen}
        onKeyDown={(event) => {
          if (event.key === "Enter" || (!dragProps && event.key === " ")) {
            event.preventDefault();
            onOpen();
          }
        }}
        ref={dragProps?.ref}
        style={dragProps?.style}
        tabIndex={0}
        {...dragProps?.attributes}
        {...dragProps?.listeners}
      >
        <div className="flex items-start justify-between gap-2">
          <button
            className="min-w-0 flex-1 text-left"
            onClick={onOpen}
            type="button"
          >
            <p
              className={`line-clamp-2 break-words font-body-sm text-body-sm leading-5 ${task.status === "COMPLETED" ? "line-through opacity-60" : ""}`}
            >
              {task.title}
            </p>
          </button>
          <div className="flex shrink-0 items-center gap-1">
            {dragProps && <GripVertical aria-hidden="true" className="text-outline opacity-60" size={16} />}
            <button
              aria-label={`Más detalles de ${task.title}`}
              className="mt-0.5 shrink-0 text-on-surface-variant opacity-50 transition-opacity hover:text-primary group-hover:opacity-100"
              onClick={onOpen}
              type="button"
            >
              <MoreHorizontal size={17} />
            </button>
          </div>
        </div>
        <div className="flex items-center justify-between gap-2 text-on-surface-variant">
          <div className="flex items-center gap-2">
            <PriorityChip priority={task.priority} />
            <span className="flex items-center gap-1 font-data-mono text-data-mono text-xs text-tertiary" title="Pomodoros"><Timer size={13} /> {task.pomodoroCount ?? 0}/{task.pomodoroEstimate ?? 0}</span>
            {subtaskTotal > 0 && <span className="flex items-center gap-1 font-data-mono text-data-mono text-xs text-secondary" title="Subtareas"><CheckSquare2 size={13} /> {completedSubtasks}/{subtaskTotal}</span>}
          </div>
          <button
            aria-label={task.status === "COMPLETED" ? "Marcar pendiente" : "Marcar completada"}
            className="font-body-sm text-body-sm hover:text-primary"
            onClick={onToggle}
            type="button"
          >
            {task.status === "COMPLETED" ? "Completada" : "Pendiente"}
          </button>
        </div>
        {onStartPomodoro && <button aria-label={`Iniciar Pomodoro para ${task.title}`} className="absolute bottom-3 right-3 flex items-center justify-center border border-outline-variant bg-surface p-1 text-primary hover:border-primary hover:bg-primary-fixed" onClick={(event) => { event.stopPropagation(); onStartPomodoro(); }} onPointerDown={(event) => event.stopPropagation()} title="Ir a Pomodoro" type="button"><Play size={13} /></button>}
      </article>
    </>
  );
}

export function SortableBacklogItem({
  task,
  onOpen,
  onToggle,
  onStartPomodoro,
}: {
  task: Task;
  onOpen: () => void;
  onToggle: () => void;
  onStartPomodoro?: () => void;
}) {
  const { attributes, isDragging, listeners, over, setNodeRef, transform, transition } = useSortable({
    id: taskDragId(task.id),
  });
  return (
    <BacklogItemShell
      dragProps={{
        attributes,
        listeners,
        ref: setNodeRef,
        style: { transform: CSS.Translate.toString(transform), transition },
      }}
      dragging={isDragging}
      dropTarget={Boolean(over) && over?.id === taskDragId(task.id)}
      onOpen={onOpen}
      onStartPomodoro={onStartPomodoro}
      onToggle={onToggle}
      task={task}
    />
  );
}
