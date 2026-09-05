"use client";

import { Check, LoaderCircle, Plus, Search, X } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import type { Task, TaskSchedule, TimeBlock, TimeBlockWithProject } from "@/types/entities";
import { useTaskSchedulesQuery, useTaskScheduleMutations } from "@/features/task-schedules/hooks/useTaskSchedules";
import { useActiveTasksQuery } from "@/features/tasks/hooks/useTasks";

export function TaskAssignmentPanel({ block, date }: { block: TimeBlock; date: string }) {
  const [search, setSearch] = useState("");
  const schedulesQuery = useTaskSchedulesQuery({ from: date, to: date });
  const tasksQuery = useActiveTasksQuery();
  const mutations = useTaskScheduleMutations();
  const assigned = useMemo(
    () => (schedulesQuery.data ?? []).filter((schedule) => schedule.timeBlockId === block.id),
    [block.id, schedulesQuery.data],
  );
  const assignedIds = useMemo(() => new Set(assigned.map((schedule) => schedule.taskId)), [assigned]);
  const tasks = useMemo(() => {
    const byId = new Map<string, Task>();
    for (const schedule of assigned) byId.set(schedule.task.id, schedule.task);
    for (const task of tasksQuery.data?.pages.flatMap((page) => page.data) ?? []) byId.set(task.id, task);
    return [...byId.values()]
      .filter((task) => `${task.title} ${task.description ?? ""}`.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()))
      .sort((a, b) => Number(assignedIds.has(b.id)) - Number(assignedIds.has(a.id)) || a.title.localeCompare(b.title));
  }, [assigned, assignedIds, search, tasksQuery.data]);

  const toggleTask = async (task: Task) => {
    try {
      if (assignedIds.has(task.id)) {
        await mutations.remove.mutateAsync(task.id);
        return;
      }
      const now = new Date().toISOString();
      const optimisticSchedule = {
        id: `optimistic:${task.id}`,
        userId: "optimistic",
        taskId: task.id,
        date,
        timeBlockId: block.id,
        order: assigned.length,
        createdAt: now,
        updatedAt: now,
        task,
        timeBlock: { ...block, project: null } as TimeBlockWithProject,
        occurrence: { occurs: true, startMin: block.startMin, endMin: block.endMin, exceptionId: null },
      } satisfies TaskSchedule;
      await mutations.save.mutateAsync({ taskId: task.id, payload: { date, timeBlockId: block.id }, optimisticSchedule });
    } catch {
      toast.error("No pudimos actualizar las tareas del bloque.");
    }
  };

  return (
    <section className="mt-4 border-t border-outline-variant pt-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h3 className="font-headline-xs text-headline-xs text-primary">Tareas de esta ocurrencia</h3>
          <p className="mt-1 font-body-sm text-body-sm text-on-surface-variant">Solo se asignan al {date}.</p>
        </div>
        {assigned.length > 0 && <span className="font-data-mono text-data-mono text-xs text-primary">{assigned.length}</span>}
      </div>
      <div className="relative mt-3">
        <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-on-surface-variant" size={14} />
        <input aria-label="Buscar tarea para el bloque" className="field h-8 pl-7 text-xs" onChange={(event) => setSearch(event.target.value)} placeholder="Buscar tarea..." type="search" value={search} />
      </div>
      <div className="mt-3 flex max-h-64 flex-col gap-1 overflow-y-auto">
        {tasksQuery.isLoading || schedulesQuery.isLoading ? (
          <p className="flex items-center justify-center gap-2 py-5 font-body-sm text-body-sm text-on-surface-variant"><LoaderCircle className="animate-spin" size={15} /> Cargando tareas...</p>
        ) : tasks.length === 0 ? (
          <p className="py-5 text-center font-body-sm text-body-sm text-on-surface-variant">No hay tareas que mostrar.</p>
        ) : (
          tasks.map((task) => {
            const assignedToBlock = assignedIds.has(task.id);
            const busy = mutations.save.isPending || mutations.remove.isPending;
            return (
              <button className="flex items-center gap-2 border border-outline-variant px-2 py-2 text-left hover:border-primary disabled:opacity-50" disabled={busy} key={task.id} onClick={() => void toggleTask(task)} type="button">
                <span className={`flex h-5 w-5 shrink-0 items-center justify-center border ${assignedToBlock ? "border-primary bg-primary text-on-primary" : "border-outline-variant text-transparent"}`}>
                  <Check size={13} />
                </span>
                <span className="min-w-0 flex-1 truncate font-body-sm text-body-sm">{task.title}</span>
                {assignedToBlock ? <X className="shrink-0 text-on-surface-variant" size={14} /> : <Plus className="shrink-0 text-primary" size={14} />}
              </button>
            );
          })
        )}
      </div>
      {tasksQuery.hasNextPage && (
        <button className="mt-2 w-full border border-outline-variant px-3 py-2 font-label-caps text-[10px] uppercase text-primary hover:bg-surface-container-low" onClick={() => void tasksQuery.fetchNextPage()} type="button">
          Cargar más tareas
        </button>
      )}
    </section>
  );
}
