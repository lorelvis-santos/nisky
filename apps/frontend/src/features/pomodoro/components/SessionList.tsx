import type { PomodoroSession } from "@/types/entities";

const phaseLabels = { WORK: "Trabajo", SHORT_BREAK: "Descanso corto", LONG_BREAK: "Descanso largo" } as const;
const statusLabels = { ACTIVE: "Activa", PAUSED: "Pausada", COMPLETED: "Completada", CANCELLED: "Cancelada" } as const;

export function SessionList({ sessions }: { sessions: PomodoroSession[] }) {
  return <div className="w-full max-w-2xl border-t border-outline-variant pt-4"><p className="mb-2 font-label-caps text-label-caps uppercase text-on-surface-variant">Tu actividad reciente</p>{sessions.length === 0 ? <p className="font-body-sm text-body-sm text-on-surface-variant">Aún no has hecho ningún Pomodoro. ¡El primero cuenta más!</p> : <div className="divide-y divide-outline-variant border-y border-outline-variant">{sessions.map((session) => <div className="flex items-center justify-between gap-3 py-3" key={session.id}><div><p className="font-body-sm text-body-sm">{phaseLabels[session.phase]}{session.task?.title ? ` · ${session.task.title}` : ""}</p><p className="font-data-mono text-data-mono text-xs text-on-surface-variant">{new Intl.DateTimeFormat("es-CO", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(session.startedAt))}</p></div><span className="font-data-mono text-data-mono text-xs text-on-surface-variant">{statusLabels[session.status]}</span></div>)}</div>}</div>;
}
