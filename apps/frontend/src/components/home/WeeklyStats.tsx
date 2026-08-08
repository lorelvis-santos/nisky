"use client";

import { Timer, CheckCircle2 } from "lucide-react";
import type { HomeWeeklyStats } from "@/types/entities";

function formatDuration(seconds: number) {
  const hours = Math.floor(seconds / 3600);
  const mins = Math.round((seconds % 3600) / 60);
  if (hours <= 0) return `${mins}m`;
  return `${hours}h ${mins}m`;
}

export function WeeklyStats({ weekly }: { weekly: HomeWeeklyStats | undefined }) {
  const pct = weekly && weekly.dueTasks > 0 ? Math.round((weekly.completedTasks / weekly.dueTasks) * 100) : 0;

  return (
    <section className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      <div className="border border-outline-variant bg-surface-container-lowest p-container-padding">
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

      <div className="border border-outline-variant bg-surface-container-lowest p-container-padding">
        <p className="flex items-center gap-2 font-label-caps text-label-caps text-on-surface-variant">
          <CheckCircle2 size={14} /> TAREAS DE LA SEMANA
        </p>
        <p className="mt-2 font-data-mono text-data-mono text-2xl text-primary">
          {weekly ? `${weekly.completedTasks} / ${weekly.dueTasks}` : "– / –"}
        </p>
        <div className="mt-2 h-2 bg-surface-container-high">
          <div
            className="h-full bg-primary-container"
            style={{ width: weekly ? `${Math.min(100, pct)}%` : "0%" }}
          />
        </div>
        <p className="mt-1 font-body-sm text-body-sm text-on-surface-variant">
          {weekly ? `${pct}% completadas de las que vencen esta semana` : "Cargando…"}
        </p>
      </div>
    </section>
  );
}
