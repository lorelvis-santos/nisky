"use client";

import { AlertCircle, CheckCircle2, CheckSquare2, Circle, GripVertical, MoreHorizontal, Play, Timer } from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { DraggableAttributes, DraggableSyntheticListeners } from "@dnd-kit/core";
import type { Task } from "@/types/entities";
import { cn, isTaskOverdue } from "@/lib/utils";
import { PriorityChip } from "./PriorityChip";
import { taskDragId } from "../dnd/TasksDnDProvider";

type HandleProps = {
  ref: (node: HTMLElement | null) => void;
  attributes: DraggableAttributes;
  listeners: DraggableSyntheticListeners;
};

export function TaskCardShell({
  task,
  onOpen,
  onToggle,
  onStartPomodoro,
  dragging = false,
  dropTarget = false,
  handleProps,
}: {
  task: Task;
  onOpen: () => void;
  onToggle: () => void;
  onStartPomodoro?: () => void;
  dragging?: boolean;
  dropTarget?: boolean;
  handleProps?: HandleProps;
}) {
  const completed = task.status === "COMPLETED";
  const overdue = isTaskOverdue(task);
  const subtaskTotal = task.subtaskCount ?? task.subtasks?.length ?? 0;
  const completedSubtasks = task.completedSubtasks ?? task.subtasks?.filter((subtask) => subtask.completed).length ?? 0;
  return (
    <article
      aria-label={`Tarea: ${task.title}`}
      className={cn(
        "group relative flex min-h-[112px] flex-col gap-2 border bg-surface p-3 transition-colors hover:border-outline",
        completed ? "border-outline-variant/60 opacity-60" : "border-outline-variant",
        overdue && "border-l-2 border-l-error",
        dropTarget && "border-2 border-primary bg-primary-container/20",
        dragging && "opacity-40",
      )}
      data-task-card
      data-task-id={task.id}
      onDoubleClick={onOpen}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpen();
        }
      }}
      tabIndex={0}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 flex-1 items-start gap-2">
          <button
            aria-label={completed ? "Marcar pendiente" : "Marcar completada"}
            className="mt-0.5 shrink-0 text-outline hover:text-primary"
            onClick={onToggle}
            type="button"
          >
            {completed ? <CheckCircle2 size={17} /> : <Circle size={17} />}
          </button>
          <button
            className="min-w-0 flex-1 text-left"
            onClick={onOpen}
            type="button"
          >
            <p
              className={`line-clamp-2 break-words font-body-sm text-body-sm leading-5 ${completed ? "line-through" : ""}`}
            >
              {task.title}
            </p>
          </button>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {/* eslint-disable react-hooks/refs -- los listeners de dnd-kit se aplican por spread (falso positivo) */}
          {handleProps && (
            <button
              aria-label={`Arrastrar ${task.title}`}
              className="flex cursor-grab touch-none items-center p-1 text-on-surface-variant hover:text-primary active:cursor-grabbing"
              ref={handleProps.ref}
              type="button"
              {...handleProps.attributes}
              {...handleProps.listeners}
            >
              <GripVertical size={16} />
            </button>
          )}
          {/* eslint-enable react-hooks/refs */}
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
      <div className="ml-7 mt-auto flex flex-wrap items-center justify-between gap-2">
        <PriorityChip priority={task.priority} />
        <div className="flex flex-wrap items-center justify-end gap-2">
          <span className="flex items-center gap-1 font-data-mono text-data-mono text-xs text-tertiary" title="Pomodoros"><Timer size={13} /> {task.pomodoroCount ?? 0}/{task.pomodoroEstimate ?? 0}</span>
          {subtaskTotal > 0 && <span className="flex items-center gap-1 font-data-mono text-data-mono text-xs text-secondary" title="Subtareas"><CheckSquare2 size={13} /> {completedSubtasks}/{subtaskTotal}</span>}
          {overdue && <AlertCircle aria-label="Vencida" className="shrink-0 text-error" size={13} />}
          {onStartPomodoro && <button aria-label={`Iniciar Pomodoro para ${task.title}`} className="flex shrink-0 items-center justify-center border border-outline-variant bg-surface p-1 text-primary hover:border-primary hover:bg-primary-fixed" onClick={(event) => { event.stopPropagation(); onStartPomodoro(); }} onPointerDown={(event) => event.stopPropagation()} title="Ir a Pomodoro" type="button"><Play size={13} /></button>}
        </div>
      </div>
    </article>
  );
}

export function SortableTaskCard({
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
  const { attributes, isDragging, listeners, over, setActivatorNodeRef, setNodeRef, transform, transition } = useSortable({
    id: taskDragId(task.id),
  });
  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
  };
  return (
    <div ref={setNodeRef} style={style}>
      <TaskCardShell
        dropTarget={Boolean(over) && over?.id === taskDragId(task.id)}
        dragging={isDragging}
        handleProps={{ attributes, listeners, ref: setActivatorNodeRef }}
        onOpen={onOpen}
        onStartPomodoro={onStartPomodoro}
        onToggle={onToggle}
        task={task}
      />
    </div>
  );
}
