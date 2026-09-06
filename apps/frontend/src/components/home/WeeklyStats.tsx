"use client";

import { Timer, CheckCircle2 } from "lucide-react";
import type { HomeWeeklyStats } from "@/types/entities";

function formatDuration(seconds: number) {
  const hours = Math.floor(seconds / 3600);
  const mins = Math.round((seconds % 3600) / 60);
  if (hours <= 0) return `${mins}m`;
  return `${hours}h ${mins}m`;
}

function formatMinutes(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  if (hours <= 0) return `${mins}m`;
  return `${hours}h ${mins}m`;
}

export function WeeklyStats({ weekly }: { weekly: HomeWeeklyStats | undefined }) {
  const pct = weekly && weekly.dueTasks > 0 ? Math.round((weekly.completedTasks / weekly.dueTasks) * 100) : 0;

  return (
    <section className="space-y-3">
      <header className="flex items-end justify-between gap-3 px-1">
        <div>
          <p className="font-label-caps text-label-caps text-primary">ESTA SEMANA</p>
          <h2 className="mt-1 font-headline-xs text-headline-xs font-bold text-on-surface">Resumen de progreso</h2>
        </div>
        {weekly && <span className="font-body-sm text-body-sm text-on-surface-variant">{pct}% de tareas cumplidas</span>}
      </header>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <div className="rounded-lg border border-outline-variant bg-surface-container-lowest p-container-padding shadow-sm">
          <p className="flex items-center gap-2 font-label-caps text-label-caps text-on-surface-variant">
            <Timer size={14} /> ENFOQUE SEMANAL
          </p>
          <p className="mt-2 font-data-mono text-data-mono text-2xl text-primary">
            {weekly ? formatDuration(weekly.totalWorkSec) : "–"}
          </p>
          <p className="mt-1 font-body-sm text-body-sm text-on-surface-variant">
            {weekly ? `${weekly.completedWorkSessions} pomodoros completados` : "Cargando…"}
          </p>
        </div>

        <div className="rounded-lg border border-outline-variant bg-surface-container-lowest p-container-padding shadow-sm">
          <p className="flex items-center gap-2 font-label-caps text-label-caps text-on-surface-variant">
            <CheckCircle2 size={14} /> TAREAS DE LA SEMANA
          </p>
          <p className="mt-2 font-data-mono text-data-mono text-2xl text-primary">
            {weekly ? `${weekly.completedTasks} / ${weekly.dueTasks}` : "– / –"}
          </p>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface-container-high">
            <div
              className="h-full rounded-full bg-tertiary"
              style={{ width: weekly ? `${Math.min(100, pct)}%` : "0%" }}
            />
          </div>
          <p className="mt-1 font-body-sm text-body-sm text-on-surface-variant">
            {weekly ? `${pct}% completadas de las que vencen esta semana` : "Cargando…"}
          </p>
        </div>

        {weekly?.projectProgress && weekly.projectProgress.length > 0 && (
          <div className="col-span-1 rounded-lg border border-outline-variant bg-surface-container-lowest p-container-padding shadow-sm sm:col-span-2">
            <p className="mb-3 font-label-caps text-label-caps text-on-surface-variant">OBJETIVOS DE PROYECTO</p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {weekly.projectProgress.map((p) => {
                const pct = Math.min(100, Math.round((p.spentMinutes / p.targetMinutes) * 100));
                return (
                  <div key={p.id} className="flex flex-col gap-1">
                    <div className="flex items-center justify-between text-xs font-medium text-on-surface">
                      <span className="flex items-center gap-1.5 truncate">
                        <span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: p.color }} />
                        <span className="truncate">{p.name}</span>
                      </span>
                      <span className="shrink-0 font-data-mono text-[10px] text-on-surface-variant">
                        {formatMinutes(p.spentMinutes)} / {formatMinutes(p.targetMinutes)}
                      </span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-surface-container-high">
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: p.color }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
