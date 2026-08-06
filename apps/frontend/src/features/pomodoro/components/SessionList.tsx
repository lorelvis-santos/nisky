"use client";

import { ChevronDown, Timer } from "lucide-react";
import { useState } from "react";
import type { PomodoroSession } from "@/types/entities";

function formatDuration(seconds: number) {
  const minutes = Math.round(seconds / 60);
  return minutes < 1 ? "menos de 1 min" : `${minutes} min`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-CO", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function SessionList({ sessions }: { sessions: PomodoroSession[] }) {
  const [expanded, setExpanded] = useState(false);
  const completedWork = sessions.filter(
    (session) => session.phase === "WORK" && session.status === "COMPLETED",
  );
  const totalWorkSec = completedWork.reduce(
    (total, session) => total + (session.actualSec ?? session.plannedSec),
    0,
  );
  const latest = completedWork[0];

  return (
    <section className="w-full max-w-2xl border-t border-outline-variant pt-4">
      <button
        aria-expanded={expanded}
        className="flex w-full items-center justify-between gap-3 text-left"
        onClick={() => setExpanded((current) => !current)}
        type="button"
      >
        <div className="min-w-0">
          <p className="font-label-caps text-label-caps uppercase text-on-surface-variant">TU ACTIVIDAD</p>
          <p className="mt-1 font-body-sm text-body-sm text-on-surface-variant">
            {completedWork.length} {completedWork.length === 1 ? "Pomodoro" : "Pomodoros"} · {formatDuration(totalWorkSec)} enfocado
          </p>
          {latest && (
            <p className="mt-1 truncate font-body-sm text-body-sm text-on-surface-variant">
              Último: {latest.task?.title ?? "Pomodoro sin tarea"} · {formatDate(latest.startedAt)}
            </p>
          )}
        </div>
        <span className="flex shrink-0 items-center gap-1 font-body-sm text-body-sm text-primary">
          {expanded ? "Ocultar" : "Ver actividad"}
          <ChevronDown className={expanded ? "rotate-180" : undefined} size={16} />
        </span>
      </button>

      {expanded && (
        <div className="mt-3 border-y border-outline-variant">
          {completedWork.length === 0 ? (
            <p className="py-3 font-body-sm text-body-sm text-on-surface-variant">
              Aún no has completado ningún Pomodoro.
            </p>
          ) : (
            completedWork.map((session) => (
              <div className="flex items-center justify-between gap-3 border-b border-outline-variant py-3 last:border-b-0" key={session.id}>
                <div className="min-w-0">
                  <p className="truncate font-body-sm text-body-sm text-on-surface">
                    {session.task?.title ?? "Pomodoro sin tarea"}
                  </p>
                  <p className="font-data-mono text-data-mono text-xs text-on-surface-variant">
                    {formatDate(session.startedAt)}
                  </p>
                </div>
                <span className="flex shrink-0 items-center gap-1 font-data-mono text-data-mono text-xs text-on-surface-variant">
                  <Timer size={13} /> {formatDuration(session.actualSec ?? session.plannedSec)}
                </span>
              </div>
            ))
          )}
        </div>
      )}
    </section>
  );
}
