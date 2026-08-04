import { CheckSquare2, GripVertical, MoreHorizontal, Timer } from "lucide-react";
import type { Task } from "@/types/entities";
import { PriorityChip } from "./PriorityChip";

export function BacklogItem({
  task,
  onOpen,
  onToggle,
  onDragStateChange,
}: {
  task: Task;
  onOpen: () => void;
  onToggle: () => void;
  onDragStateChange?: (dragging: boolean) => void;
}) {
  const subtaskTotal = task.subtaskCount ?? task.subtasks?.length ?? 0;
  const completedSubtasks = task.completedSubtasks ?? task.subtasks?.filter((subtask) => subtask.completed).length ?? 0;
  return (
    <article
      aria-label={`Tarea pendiente: ${task.title}`}
      className="group flex min-h-[104px] cursor-grab flex-col gap-2 border border-outline-variant bg-surface p-3 transition-colors hover:border-outline active:cursor-grabbing"
      draggable
      onDoubleClick={onOpen}
      onDragEnd={() => onDragStateChange?.(false)}
      onDragStart={(event) => {
        event.dataTransfer.setData("text/task-id", task.id);
        event.dataTransfer.effectAllowed = "move";
        onDragStateChange?.(true);
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpen();
        }
      }}
      tabIndex={0}
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
        <button
          aria-label={`Más detalles de ${task.title}`}
          className="mt-0.5 shrink-0 text-on-surface-variant opacity-50 transition-opacity hover:text-primary group-hover:opacity-100"
          onClick={onOpen}
          type="button"
        >
          <MoreHorizontal size={17} />
        </button>
      </div>
      <div className="flex items-center justify-between gap-2 text-on-surface-variant">
        <div className="flex items-center gap-2">
          <PriorityChip priority={task.priority} />
          <span className="flex items-center gap-1 font-data-mono text-data-mono text-xs text-tertiary" title="Pomodoros"><Timer size={13} /> {task.pomodoroCount ?? 0}/{task.pomodoroEstimate ?? 0}</span>
          {subtaskTotal > 0 && <span className="flex items-center gap-1 font-data-mono text-data-mono text-xs text-secondary" title="Subtareas"><CheckSquare2 size={13} /> {completedSubtasks}/{subtaskTotal}</span>}
        </div>
        <div className="flex items-center gap-2">
          <button
            aria-label={
              task.status === "COMPLETED"
                ? "Marcar pendiente"
                : "Marcar completada"
            }
            className="font-body-sm text-body-sm hover:text-primary"
            onClick={onToggle}
            type="button"
          >
            {task.status === "COMPLETED" ? "Completada" : "Pendiente"}
          </button>
          <GripVertical
            className="opacity-0 transition-opacity group-hover:opacity-100"
            size={16}
          />
        </div>
      </div>
    </article>
  );
}
