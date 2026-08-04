import { CheckCircle2, Circle, MoreHorizontal } from "lucide-react";
import type { Task } from "@/types/entities";
import { isTaskOverdue } from "@/lib/utils";
import { PriorityChip } from "./PriorityChip";

export function TaskCard({
  task,
  onOpen,
  onToggle,
  onDragStateChange,
  onDragOver,
  onDrop,
  isDropTarget,
}: {
  task: Task;
  onOpen: () => void;
  onToggle: () => void;
  onDragStateChange?: (dragging: boolean) => void;
  onDragOver?: (event: React.DragEvent<HTMLElement>) => void;
  onDrop?: (event: React.DragEvent<HTMLElement>) => void;
  isDropTarget?: boolean;
}) {
  const completed = task.status === "COMPLETED";
  const overdue = isTaskOverdue(task);
  return (
    <article
      aria-label={`Tarea: ${task.title}`}
      className={`group flex min-h-[112px] cursor-grab flex-col gap-2 border bg-surface p-3 transition-colors hover:border-outline active:cursor-grabbing ${completed ? "border-outline-variant/60 opacity-60" : "border-outline-variant"} ${overdue ? "border-l-2 border-l-error" : ""} ${isDropTarget ? "border-t-2 border-t-primary" : ""}`}
      draggable
      onDoubleClick={onOpen}
      onDragEnd={() => onDragStateChange?.(false)}
      onDragStart={(event) => {
        event.dataTransfer.setData("text/task-id", task.id);
        event.dataTransfer.effectAllowed = "move";
        onDragStateChange?.(true);
      }}
      onDragOver={(event) => {
        event.preventDefault();
        onDragOver?.(event);
      }}
      onDrop={(event) => {
        event.preventDefault();
        onDrop?.(event);
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
        <button
          aria-label={`Más detalles de ${task.title}`}
          className="mt-0.5 shrink-0 text-on-surface-variant opacity-50 transition-opacity hover:text-primary group-hover:opacity-100"
          onClick={onOpen}
          type="button"
        >
          <MoreHorizontal size={17} />
        </button>
      </div>
      <div className="ml-7 flex items-center justify-between gap-2">
        <PriorityChip priority={task.priority} />
        {overdue && <span className="font-data-mono text-data-mono text-xs text-error">Vencida</span>}
      </div>
    </article>
  );
}
