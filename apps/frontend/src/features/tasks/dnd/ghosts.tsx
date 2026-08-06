"use client";

import { AlertCircle, CheckSquare2, Timer } from "lucide-react";
import type { Task } from "@/types/entities";
import { isTaskOverdue } from "@/lib/utils";
import { PriorityChip } from "../components/PriorityChip";

export function TaskCardGhost({ task, width, height }: { task: Task; width?: number; height?: number }) {
  const completed = task.status === "COMPLETED";
  const overdue = isTaskOverdue(task);
  const subtaskTotal = task.subtaskCount ?? task.subtasks?.length ?? 0;
  const completedSubtasks = task.completedSubtasks ?? task.subtasks?.filter((subtask) => subtask.completed).length ?? 0;
  return (
    <article
      className="flex min-h-[112px] w-72 max-w-[22rem] flex-col gap-2 border-2 border-primary bg-surface p-3"
      style={width || height ? { width, height } : undefined}
    >
      <p className={`line-clamp-2 break-words font-body-sm text-body-sm leading-5 ${completed ? "line-through opacity-60" : ""}`}>
        {task.title}
      </p>
      <div className="mt-auto flex flex-wrap items-center justify-between gap-2">
        <PriorityChip priority={task.priority} />
        <div className="flex flex-wrap items-center gap-2">
          <span className="flex items-center gap-1 font-data-mono text-data-mono text-xs text-tertiary" title="Pomodoros">
            <Timer size={13} /> {task.pomodoroCount ?? 0}/{task.pomodoroEstimate ?? 0}
          </span>
          {subtaskTotal > 0 && (
            <span className="flex items-center gap-1 font-data-mono text-data-mono text-xs text-secondary" title="Subtareas">
              <CheckSquare2 size={13} /> {completedSubtasks}/{subtaskTotal}
            </span>
          )}
          {overdue && <AlertCircle aria-label="Vencida" className="shrink-0 text-error" size={13} />}
        </div>
      </div>
    </article>
  );
}

export function BacklogItemGhost({ task, width, height }: { task: Task; width?: number; height?: number }) {
  const completed = task.status === "COMPLETED";
  const subtaskTotal = task.subtaskCount ?? task.subtasks?.length ?? 0;
  const completedSubtasks = task.completedSubtasks ?? task.subtasks?.filter((subtask) => subtask.completed).length ?? 0;
  return (
    <article
      className="flex w-72 max-w-[22rem] flex-col gap-2 border-2 border-primary bg-surface p-3"
      style={width || height ? { width, height } : undefined}
    >
      <p className={`line-clamp-2 break-words font-body-sm text-body-sm leading-5 ${completed ? "line-through opacity-60" : ""}`}>
        {task.title}
      </p>
      <div className="flex items-center gap-2 text-on-surface-variant">
        <PriorityChip priority={task.priority} />
        <span className="flex items-center gap-1 font-data-mono text-data-mono text-xs text-tertiary" title="Pomodoros">
          <Timer size={13} /> {task.pomodoroCount ?? 0}/{task.pomodoroEstimate ?? 0}
        </span>
        {subtaskTotal > 0 && (
          <span className="flex items-center gap-1 font-data-mono text-data-mono text-xs text-secondary" title="Subtareas">
            <CheckSquare2 size={13} /> {completedSubtasks}/{subtaskTotal}
          </span>
        )}
      </div>
    </article>
  );
}
