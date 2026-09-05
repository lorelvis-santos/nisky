"use client";

import { AlertCircle, CalendarDays, CheckCircle2, Circle, ListChecks, MapPin, Play } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { localDateKey } from "@/lib/utils";
import { PriorityChip } from "@/features/tasks/components/PriorityChip";
import { minToTime } from "@/features/timeblocks/lib/time";
import type { CalendarEvent, Task, TimeBlockWithProject } from "@/types/entities";

function formatDuration(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours <= 0) return `${mins} min`;
  return `${hours} h ${mins} min`;
}

function useNowMinutes() {
  const [nowMin, setNowMin] = useState(() => new Date().getHours() * 60 + new Date().getMinutes());
  useEffect(() => {
    const interval = window.setInterval(() => {
      setNowMin(new Date().getHours() * 60 + new Date().getMinutes());
    }, 30_000);
    return () => window.clearInterval(interval);
  }, []);
  return nowMin;
}

function useNowTimestamp() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(interval);
  }, []);
  return now;
}

function dueBadge(task: Task) {
  const todayKey = localDateKey(new Date());
  const overdue = task.dueDate && localDateKey(task.dueDate) < todayKey;
  const today = task.dueDate && localDateKey(task.dueDate) === todayKey;
  if (!task.dueDate) return null;
  return (
    <span className={`flex shrink-0 items-center gap-1 whitespace-nowrap font-data-mono text-data-mono text-[11px] ${overdue ? "text-error" : "text-on-surface-variant"}`}>
      {overdue ? <AlertCircle size={11} /> : <CalendarDays size={11} />}
      {overdue ? "Atrasada" : today ? "Hoy" : localDateKey(task.dueDate)}
    </span>
  );
}

export function ActiveBlockBanner({
  block,
  nextBlock,
  nextBlockStart,
  tasks,
  activeEvent,
  onPlayPomodoro,
  onToggleTask,
}: {
  block: TimeBlockWithProject | null;
  nextBlock: TimeBlockWithProject | null;
  nextBlockStart: string | null;
  tasks: Task[];
  activeEvent: CalendarEvent | null;
  onPlayPomodoro: (taskId?: string, projectId?: string) => void;
  onToggleTask: (task: Task) => void;
}) {
  const nowMin = useNowMinutes();
  const nowTimestamp = useNowTimestamp();

  if (activeEvent) {
    const color = activeEvent.color ?? "#0f172a";
    const timeLabel = activeEvent.allDay
      ? "Todo el día"
      : `${minToTime(activeEvent.startMin ?? 0)}–${minToTime(activeEvent.endMin ?? 0)}`;
    return (
      <div
        className="flex flex-col gap-3 rounded-2xl border border-outline-variant bg-surface-container-lowest p-container-padding shadow-sm"
        style={{ borderTop: `3px solid ${color}` }}
      >
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-outline-variant pb-3">
          <div className="flex min-w-0 items-center gap-2">
            <span aria-hidden="true" className="relative flex h-2 w-2 shrink-0">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60" style={{ backgroundColor: color }} />
              <span className="relative inline-flex h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
            </span>
            <p className="font-label-caps text-label-caps text-secondary">AHORA MISMO</p>
          </div>
          <p className="font-data-mono text-data-mono text-xs text-on-surface-variant">{timeLabel}</p>
        </div>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate font-headline-sm text-headline-sm font-bold text-on-surface">{activeEvent.title}</p>
            {activeEvent.location && (
              <p className="mt-1 flex items-center gap-1.5 font-body-sm text-body-sm text-on-surface-variant">
                <MapPin size={13} className="shrink-0" />
                <span className="line-clamp-1">{activeEvent.location}</span>
              </p>
            )}
          </div>
          <Link
            className="rounded-xl border border-outline-variant px-3 py-2 font-label-caps text-label-caps text-primary hover:bg-surface-container-low"
            href="/events"
          >
            VER AGENDA
          </Link>
        </div>
      </div>
    );
  }

  if (!block) {
    if (nextBlock && nextBlockStart) {
      const diffMs = new Date(nextBlockStart).getTime() - nowTimestamp;
      const diffMin = Math.max(0, Math.round(diffMs / 60_000));
      const dayDiff = Math.floor(diffMs / 86_400_000);
      const whenLabel =
        dayDiff >= 1
          ? `Mañana ${minToTime(nextBlock.startMin)}`
          : `En ${formatDuration(diffMin)}`;
      const label = nextBlock.project?.name ?? nextBlock.name ?? "Bloque de enfoque";
      const color = nextBlock.project?.color ?? "#0f172a";
      return (
        <div className="flex flex-col gap-3 rounded-2xl border border-outline-variant bg-surface-container-lowest p-container-padding shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
              <span aria-hidden="true" className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />
              <div className="min-w-0">
                <p className="truncate font-headline-xs text-headline-xs font-bold" style={{ color }}>
                  Próximo bloque
                </p>
                <p className="truncate font-body-sm text-body-sm text-on-surface-variant">{label}</p>
              </div>
            </div>
            <p className="flex shrink-0 items-center gap-1.5 rounded-xl border border-outline-variant bg-surface-container-low px-3 py-1.5 font-data-mono text-data-mono text-xs text-on-surface-variant">
              <CalendarDays size={13} />
              {whenLabel}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-outline-variant pt-3">
            <p className="font-data-mono text-data-mono text-xs text-on-surface-variant">
              {minToTime(nextBlock.startMin)}–{minToTime(nextBlock.endMin)}
            </p>
            <Link className="font-label-caps text-label-caps text-primary hover:underline" href="/timeblocks">
              VER HORARIO
            </Link>
            <button
              className="ml-auto flex h-9 items-center gap-2 rounded-xl border border-primary bg-primary px-4 font-body-sm text-body-sm text-on-primary hover:bg-primary-container hover:text-on-primary-container"
              onClick={() => onPlayPomodoro()}
              type="button"
            >
              <Play size={15} /> Comenzar enfoque
            </button>
          </div>
        </div>
    );
    }
    return (
      <div className="flex flex-col gap-3 rounded-2xl border border-outline-variant bg-surface-container-lowest p-container-padding shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <span aria-hidden="true" className="h-2.5 w-2.5 shrink-0 rounded-full bg-outline-variant" />
            <p className="mt-2 font-label-caps text-label-caps text-on-surface-variant">SIGUIENTE PASO</p>
            <p className="mt-1 font-headline-sm text-headline-sm font-bold text-on-surface">Elige qué avanzar ahora</p>
            <p className="mt-1 font-body-sm text-body-sm text-on-surface-variant">No hay un bloque de enfoque activo en este momento.</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 border-t border-outline-variant pt-3">
          <button
            className="flex min-h-11 items-center gap-2 rounded-xl border border-primary bg-primary px-4 font-body-sm text-body-sm text-on-primary hover:bg-primary/90"
            onClick={() => onPlayPomodoro()}
            type="button"
          >
            <Play size={15} /> Comenzar enfoque
          </button>
          <Link className="font-label-caps text-label-caps text-primary hover:underline" href="/timeblocks">
            Configurar horario
          </Link>
        </div>
      </div>
    );
  }

  const MAX_VISIBLE_TASKS = 3;
  const visibleTasks = tasks.slice(0, MAX_VISIBLE_TASKS);
  const remainingTasks = tasks.length - visibleTasks.length;
  const nextTask = visibleTasks[0];
  const completedTasks = tasks.filter((task) => task.status === "COMPLETED").length;
  const taskProgress = tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0;

  const label = block.project?.name ?? block.name ?? "Bloque de enfoque";
  const color = block.project?.color ?? "#0f172a";
  const remaining = Math.max(0, block.endMin - nowMin);
  const firstTask = tasks[0];

  return (
    <div
      className="flex flex-col gap-3 rounded-2xl border border-outline-variant bg-surface-container-lowest p-container-padding shadow-sm"
      style={{ borderTop: `3px solid ${color}` }}
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-outline-variant pb-3">
        <div className="flex items-center gap-2">
          <span aria-hidden="true" className="relative flex h-2 w-2 shrink-0">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60" style={{ backgroundColor: color }} />
            <span className="relative inline-flex h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
          </span>
          <p className="font-label-caps text-label-caps text-secondary">AHORA MISMO</p>
        </div>
        <p className="font-data-mono text-data-mono text-xs text-on-surface-variant">
          {minToTime(block.startMin)}–{minToTime(block.endMin)}
        </p>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-headline-sm text-headline-sm font-bold text-on-surface">{label}</p>
          <p className="mt-1 font-body-sm text-body-sm text-on-surface-variant">
            Restan {formatDuration(remaining)}
            {tasks.length > 0 && ` · ${completedTasks} de ${tasks.length} tareas`}
          </p>
        </div>
        <button
          className="flex h-9 shrink-0 items-center gap-2 rounded-xl border border-primary bg-primary px-4 font-body-sm text-body-sm text-on-primary hover:bg-primary-container hover:text-on-primary-container active:scale-[0.98]"
          onClick={() => onPlayPomodoro(firstTask?.id, block.projectId ?? undefined)}
          type="button"
        >
          <Play size={15} /> Enfoque
        </button>
      </div>

      {tasks.length > 0 && (
        <div className="h-2 overflow-hidden rounded-full bg-surface-container-high" role="progressbar" aria-label="Tareas del bloque completadas" aria-valuemax={100} aria-valuemin={0} aria-valuenow={taskProgress}>
          <div className="h-full rounded-full bg-tertiary" style={{ width: `${taskProgress}%` }} />
        </div>
      )}

      {tasks.length > 0 && (
        <div className="pt-1.5">
          <p className="flex items-center gap-1.5 py-1 font-label-caps text-label-caps text-on-surface-variant">
            <ListChecks size={13} />
            TAREAS DEL BLOQUE ({tasks.length})
          </p>
          <ul className="flex flex-col divide-y divide-outline-variant">
            {visibleTasks.map((task) => (
              <li
                className="flex items-center gap-2 py-1.5"
                key={task.id}
              >
                <button
                  aria-label={`Completar ${task.title}`}
                  className="shrink-0 text-outline hover:text-primary"
                  onClick={() => onToggleTask(task)}
                  type="button"
                >
                  {task.status === "COMPLETED" ? <CheckCircle2 className="text-primary" size={15} /> : <Circle size={15} />}
                </button>
                <Link
                  className="line-clamp-1 min-w-0 flex-1 font-body-sm text-body-sm font-medium hover:text-primary"
                  href={`/tasks?taskId=${encodeURIComponent(task.id)}`}
                >
                  {task.title}
                </Link>
                {task.id === nextTask?.id && task.status !== "COMPLETED" && (
                  <span className="shrink-0 border border-primary px-1.5 py-0.5 font-label-caps text-label-caps text-[10px] uppercase text-primary">
                    Siguiente
                  </span>
                )}
                <PriorityChip priority={task.priority} />
                {dueBadge(task)}
              </li>
            ))}
          </ul>
          {remainingTasks > 0 && (
            <Link
              className="mt-1 inline-flex items-center gap-1 font-label-caps text-label-caps text-primary hover:underline"
              href="/tasks"
            >
              Ver {remainingTasks} más en Planificación y tareas
            </Link>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-outline-variant pt-3">
        <Link className="font-label-caps text-label-caps text-primary hover:underline" href="/timeblocks">
          VER HORARIO
        </Link>
      </div>
    </div>
  );
}
