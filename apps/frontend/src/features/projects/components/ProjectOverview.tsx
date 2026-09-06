"use client";

import { AlertTriangle, ArrowUpRight, CalendarDays, Circle, RefreshCw } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import type { ProjectSummary, Task } from "@/types/entities";
import { formatDateTime } from "@/lib/utils";
import { ProjectContextPanel, ProjectProgressCard } from "./ProjectContextPanel";

export function ProjectOverview({ summary, onOpenTasks, onOpenTask, isError = false, onRetry }: { summary: ProjectSummary | null; onOpenTasks: () => void; onOpenTask: (task: Task) => void; isError?: boolean; onRetry?: () => void }) {
  if (isError && !summary) return <OverviewError onRetry={onRetry} />;
  if (!summary) return <OverviewSkeleton />;
  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,0.42fr)]">
      <div className="space-y-5">
        <ProjectProgressCard summary={summary} />

        {summary.counts.overdue > 0 && (
          <section className="project-panel border-[#f0c5ce] bg-[#fff8f9] p-4 sm:p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#fff1f3] text-[#e11d48]"><AlertTriangle size={17} /></span>
              <div className="min-w-0">
                <p className="project-eyebrow">ATENCIÓN</p>
                 <h2 className="mt-1 text-[16px] font-semibold text-[#1f2933]">{summary.counts.overdue} {summary.counts.overdue === 1 ? "tarea vencida" : "tareas vencidas"}</h2>
                 <p className="mt-1 text-[12px] leading-5 text-[#5f6872]">Revisa estas tareas para recuperar el ritmo del proyecto.</p>
              </div>
              <button className="inline-flex min-h-10 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-[#e6b8c2] px-3 text-[12px] font-semibold text-[#c73b52] hover:bg-[#fff1f3] sm:ml-auto" onClick={onOpenTasks} type="button">Revisar tareas <ArrowUpRight size={14} /></button>
            </div>
          </section>
        )}

        <section className="project-panel p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="project-eyebrow">SIGUIENTE PASO</p>
               <h2 className="mt-1 text-[17px] font-semibold text-[#1f2933]">Próximas acciones</h2>
            </div>
             <button className="rounded-md px-2 py-1 text-[12px] font-semibold text-[#1e3a5f] hover:bg-[#eff1f0] hover:underline" onClick={onOpenTasks} type="button">Ver todas</button>
           </div>
           <div className="mt-4 divide-y divide-[#e7e9e8]">
             {summary.upcomingTasks.length === 0 ? <p className="py-3 text-[13px] text-[#5f6872]">No hay acciones con fecha próxima.</p> : summary.upcomingTasks.slice(0, 4).map((task) => <OverviewTask key={task.id} onOpen={() => onOpenTask(task)} task={task} />)}
          </div>
        </section>
      </div>
      <ProjectContextPanel onOpenTask={onOpenTask} showProgress={false} showUpcomingDates={false} summary={summary} />
    </div>
  );
}

function OverviewTask({ task, onOpen }: { task: Task; onOpen: () => void }) {
  return <button className="group flex w-full items-center gap-3 rounded-md px-2 py-3 text-left hover:bg-[#eff1f0]" onClick={onOpen} type="button"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#e7e9e8] text-[#1e3a5f]"><Circle size={15} /></span><span className="min-w-0 flex-1"><span className="block truncate text-[13px] font-medium text-[#2f3b45] group-hover:text-[#1e3a5f]">{task.title}</span><span className="mt-1 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-[#5f6872]"><span className="inline-flex items-center gap-1"><CalendarDays size={12} />{task.dueDate ? formatDateTime(task.dueDate) : "Sin fecha límite"}</span>{task.assignee ? <span className="inline-flex min-w-0 items-center gap-1.5"><Avatar avatarUrl={task.assignee.avatarUrl} email={task.assignee.email} name={task.assignee.name} size="xs" /><span className="max-w-[9rem] truncate">{task.assignee.name ?? task.assignee.email}</span></span> : <span>Sin asignar</span>}</span></span><ArrowUpRight className="shrink-0 text-[#a3aaad] transition-colors group-hover:text-[#1e3a5f]" size={14} /></button>;
}

function OverviewError({ onRetry }: { onRetry?: () => void }) {
  return <div className="project-panel flex min-h-64 flex-col items-center justify-center gap-3 p-5 text-center"><RefreshCw className="text-[#c73b52]" size={22} /><p className="text-[13px] text-[#5f6872]">No pudimos cargar el resumen del proyecto.</p>{onRetry && <button className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-[#dde1e2] px-3 text-[12px] font-semibold text-[#1e3a5f] hover:bg-[#eff1f0]" onClick={onRetry} type="button"><RefreshCw size={14} /> Reintentar</button>}</div>;
}

function OverviewSkeleton() {
  return <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,0.42fr)]" aria-hidden="true"><div className="space-y-5"><div className="project-panel h-64 animate-pulse" /><div className="project-panel h-72 animate-pulse" /></div><div className="project-panel h-[26rem] animate-pulse" /></div>;
}
