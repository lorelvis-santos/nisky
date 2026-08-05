"use client";

import { CheckCircle2, CheckSquare2, ChevronDown, Timer } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import type { Task } from "@/types/entities";
import { useTaskMutations } from "@/features/tasks/hooks/useTasks";

export function TaskFocusDetails({
  task,
  disabled,
  onComplete,
}: {
  task: Task;
  disabled: boolean;
  onComplete: () => Promise<void>;
}) {
  const mutations = useTaskMutations();
  const [estimate, setEstimate] = useState(task.pomodoroEstimate);
  const total = task.subtaskCount ?? task.subtasks?.length ?? 0;
  const completed = task.completedSubtasks ?? task.subtasks?.filter((subtask) => subtask.completed).length ?? 0;

  const saveEstimate = async () => {
    try {
      await mutations.update.mutateAsync({ id: task.id, payload: { pomodoroEstimate: estimate } });
      toast.success("¡Estimado guardado!");
    } catch {
      toast.error("Ups, no pudimos guardar el estimado. Inténtalo de nuevo.");
    }
  };

  const toggleSubtask = async (subtaskId: string, nextCompleted: boolean) => {
    try {
      await mutations.toggleSubtask.mutateAsync({ taskId: task.id, subtaskId, completed: nextCompleted });
    } catch {
      toast.error("Ups, no pudimos actualizar la subtarea. Inténtalo de nuevo.");
    }
  };

  return (
    <section className="w-full max-w-2xl border border-outline-variant bg-surface-container-lowest p-4 text-left">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-label-caps text-label-caps uppercase text-on-surface-variant">TAREA ENFOCADA</p>
          <h2 className="mt-1 break-words font-headline-xs text-headline-xs text-primary">{task.title}</h2>
        </div>
        <button
          className="flex shrink-0 items-center gap-1 border border-outline-variant px-2 py-1 font-body-sm text-body-sm text-primary hover:bg-primary-fixed disabled:cursor-not-allowed disabled:opacity-50"
          disabled={disabled || mutations.update.isPending}
          onClick={() => void onComplete()}
          type="button"
        >
          <CheckCircle2 size={14} /> Completar tarea
        </button>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-outline-variant pt-3 font-data-mono text-data-mono text-xs text-on-surface-variant">
        <span className="flex items-center gap-1" title="Pomodoros completados y estimados">
          <Timer size={13} /> {task.pomodoroCount}/{task.pomodoroEstimate} Pomodoros
        </span>
        <span className="flex items-center gap-1" title="Subtareas completadas y totales">
          <CheckSquare2 size={13} /> {completed}/{total} Subtareas
        </span>
      </div>

      <details className="mt-3 border-t border-outline-variant pt-3" open={false}>
        <summary className="flex cursor-pointer list-none items-center justify-between font-body-sm text-body-sm text-on-surface-variant hover:text-primary">
          <span>Ajustar tarea</span>
          <ChevronDown size={16} />
        </summary>
        <div className="mt-3 space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <label className="flex-1">
              <span className="font-label-caps text-label-caps text-on-surface-variant">POMODOROS ESTIMADOS</span>
              <input
                aria-label="Pomodoros estimados"
                className="field mt-1"
                disabled={disabled}
                min={0}
                onChange={(event) => setEstimate(Math.min(100, Math.max(0, Number(event.target.value) || 0)))}
                type="number"
                value={estimate}
              />
            </label>
            <button
              className="border border-outline-variant px-3 py-2 font-body-sm text-body-sm text-primary hover:bg-surface-container-high disabled:cursor-not-allowed disabled:opacity-50"
              disabled={disabled || estimate === task.pomodoroEstimate || mutations.update.isPending}
              onClick={() => void saveEstimate()}
              type="button"
            >
              Guardar
            </button>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="font-label-caps text-label-caps text-on-surface-variant">SUBTAREAS</span>
              <span className="font-data-mono text-data-mono text-xs text-on-surface-variant">{completed}/{total}</span>
            </div>
            {total === 0 ? (
              <p className="font-body-sm text-body-sm text-on-surface-variant">Esta tarea no tiene subtareas.</p>
            ) : (
              <div className="space-y-2">
                {task.subtasks?.map((subtask) => (
                  <label className="flex items-start gap-2 font-body-sm text-body-sm" key={subtask.id}>
                    <input
                      checked={subtask.completed}
                      className="mt-1 accent-primary"
                      disabled={disabled || mutations.toggleSubtask.isPending}
                      onChange={(event) => void toggleSubtask(subtask.id, event.target.checked)}
                      type="checkbox"
                    />
                    <span className={subtask.completed ? "text-on-surface-variant line-through" : "text-on-surface"}>{subtask.title}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>
      </details>
    </section>
  );
}
