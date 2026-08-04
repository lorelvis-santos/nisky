"use client";

import { CheckSquare2, Timer } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import type { Task } from "@/types/entities";
import { useTaskMutations } from "@/features/tasks/hooks/useTasks";

export function TaskFocusDetails({ task, disabled }: { task: Task; disabled: boolean }) {
  const mutations = useTaskMutations();
  const [estimate, setEstimate] = useState(task.pomodoroEstimate);
  const total = task.subtaskCount ?? task.subtasks?.length ?? 0;
  const completed = task.completedSubtasks ?? task.subtasks?.filter((subtask) => subtask.completed).length ?? 0;
  const saveEstimate = async () => {
    try {
      await mutations.update.mutateAsync({ id: task.id, payload: { pomodoroEstimate: estimate } });
      toast.success("Estimado Pomodoro guardado");
    } catch {
      toast.error("No se pudo guardar el estimado");
    }
  };
  const toggleSubtask = async (subtaskId: string, nextCompleted: boolean) => {
    try {
      await mutations.toggleSubtask.mutateAsync({ taskId: task.id, subtaskId, completed: nextCompleted });
    } catch {
      toast.error("No se pudo actualizar la subtarea");
    }
  };

  return <section className="w-full max-w-2xl border border-outline-variant bg-surface-container-lowest p-4 text-left"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="font-label-caps text-label-caps uppercase text-on-surface-variant">TAREA SELECCIONADA</p><h2 className="mt-1 break-words font-headline-xs text-headline-xs text-primary">{task.title}</h2></div><span className="flex shrink-0 items-center gap-1 font-data-mono text-data-mono text-xs text-tertiary"><Timer size={14} /> {task.pomodoroCount}/{task.pomodoroEstimate}</span></div><div className="mt-4 flex flex-col gap-2 border-t border-outline-variant pt-3 sm:flex-row sm:items-end"><label className="flex-1"><span className="font-label-caps text-label-caps text-on-surface-variant">ESTIMADO DE POMODOROS</span><input aria-label="Estimado de Pomodoros" className="field mt-1" disabled={disabled} min={0} onChange={(event) => setEstimate(Math.min(100, Math.max(0, Number(event.target.value) || 0)))} type="number" value={estimate} /></label><button className="border border-outline-variant px-3 py-2 font-body-sm text-body-sm text-primary hover:bg-surface-container-high disabled:cursor-not-allowed disabled:opacity-50" disabled={disabled || estimate === task.pomodoroEstimate || mutations.update.isPending} onClick={() => void saveEstimate()} type="button">Guardar estimado</button><span className="font-body-sm text-body-sm text-on-surface-variant">Completados: {task.pomodoroCount}</span></div><div className="mt-4 border-t border-outline-variant pt-3"><div className="mb-2 flex items-center justify-between"><span className="flex items-center gap-1 font-label-caps text-label-caps text-on-surface-variant"><CheckSquare2 size={14} /> SUBTAREAS</span><span className="font-data-mono text-data-mono text-xs text-on-surface-variant">{completed}/{total}</span></div>{total === 0 ? <p className="font-body-sm text-body-sm text-on-surface-variant">Esta tarea no tiene subtareas.</p> : <div className="space-y-1">{(task.subtasks ?? []).map((subtask) => <label className="flex items-center gap-2 py-1 font-body-sm text-body-sm" key={subtask.id}><input checked={subtask.completed} disabled={disabled} onChange={(event) => void toggleSubtask(subtask.id, event.target.checked)} type="checkbox" /><span className={subtask.completed ? "text-on-surface-variant line-through" : ""}>{subtask.title}</span></label>)}</div>}</div></section>;
}
