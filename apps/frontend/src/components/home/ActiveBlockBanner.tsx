"use client";

import { AlertCircle, CalendarDays, CheckCircle2, Circle, ListChecks, Play } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { localDateKey } from "@/lib/utils";
import { PriorityChip } from "@/features/tasks/components/PriorityChip";
import { minToTime } from "@/features/timeblocks/lib/time";
import type { Task, TimeBlockWithProject } from "@/types/entities";

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
  onPlayPomodoro,
  onToggleTask,
}: {
  block: TimeBlockWithProject | null;
  nextBlock: TimeBlockWithProject | null;
  nextBlockStart: string | null;
  tasks: Task[];
  onPlayPomodoro: (taskId?: string, projectId?: string) => void;
  onToggleTask: (task: Task) => void;
}) {
  const nowMin = useNowMinutes();
  const nowTimestamp = useNowTimestamp();

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
      const color = nextBlock.project?.color ?? "#303e51";
      return (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border border-outline-variant bg-surface-container-lowest px-container-padding py-3 sm:px-4">
          <div className="flex min-w-0 items-center gap-2">
            <span aria-hidden="true" className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: color }} />
            <p className="truncate font-headline-xs text-headline-xs font-bold" style={{ color }}>
              {label}
            </p>
            <p className="shrink-0 font-data-mono text-data-mono text-xs text-on-surface-variant">
              {minToTime(nextBlock.startMin)}–{minToTime(nextBlock.endMin)}
            </p>
          </div>
          <p className="flex shrink-0 items-center gap-1.5 border border-primary bg-primary-container px-3 py-1 font-data-mono text-data-mono text-sm font-semibold text-on-primary">
            <CalendarDays size={14} />
            {whenLabel}
          </p>
          <div className="ml-auto flex items-center gap-3">
            <Link className="font-label-caps text-label-caps text-primary hover:underline" href="/timeblocks">
              VER AGENDA
            </Link>
            <button
              className="flex h-9 items-center gap-2 border border-outline-variant bg-primary px-4 font-body-sm text-body-sm text-on-primary hover:bg-primary-container hover:text-on-primary-container"
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
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border border-outline-variant bg-surface-container-lowest px-container-padding py-3 sm:px-4">
        <div className="flex min-w-0 items-center gap-2">
          <span aria-hidden="true" className="h-3 w-3 shrink-0 rounded-full bg-outline-variant" />
          <p className="truncate font-headline-xs text-headline-xs font-bold text-on-surface-variant">
            Sin bloque activo ahora
          </p>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <Link className="font-label-caps text-label-caps text-primary hover:underline" href="/timeblocks">
            VER AGENDA
          </Link>
          <Link className="font-label-caps text-label-caps text-primary hover:underline" href="/timeblocks">
            NUEVO BLOQUE
          </Link>
          <button
            className="flex h-9 items-center gap-2 border border-outline-variant bg-primary px-4 font-body-sm text-body-sm text-on-primary hover:bg-primary-container hover:text-on-primary-container"
            onClick={() => onPlayPomodoro()}
            type="button"
          >
            <Play size={15} /> Comenzar enfoque
          </button>
        </div>
      </div>
    );
  }

  const MAX_VISIBLE_TASKS = 3;
const visibleTasks = tasks.slice(0, MAX_VISIBLE_TASKS);
const remainingTasks = tasks.length - visibleTasks.length;
const nextTask = visibleTasks[0];

const label = block.project?.name ?? block.name ?? "Bloque de enfoque";
  const color = block.project?.color ?? "#303e51";
  const remaining = Math.max(0, block.endMin - nowMin);
  const firstTask = tasks[0];
  const focusLabel = firstTask ? "Enfocarme ahora" : "Comenzar enfoque";

  return (
    <div
      className="flex flex-col gap-2 border border-outline-variant bg-surface-container-lowest px-container-padding py-3 sm:px-4"
      style={{ borderTop: `3px solid ${color}` }}
    >
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-outline-variant pb-2">
        <div className="flex min-w-0 items-center gap-2">
          <span aria-hidden="true" className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: color }} />
          <p
            className="truncate font-headline-sm text-headline-sm font-bold"
            style={{ color }}
          >
            {label}
          </p>
          <p className="shrink-0 font-data-mono text-data-mono text-xs text-on-surface-variant">
            {minToTime(block.startMin)}–{minToTime(block.endMin)}
          </p>
        </div>
        <p className="shrink-0 border border-primary bg-primary-container px-3 py-1 font-data-mono text-data-mono text-sm font-semibold text-on-primary">
          {formatDuration(remaining)}
        </p>
      </div>

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

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-outline-variant pt-2">
        <Link className="font-label-caps text-label-caps text-primary hover:underline" href="/timeblocks">
          VER AGENDA
        </Link>
        <button
          className="flex h-9 items-center gap-2 border border-outline-variant bg-primary px-4 font-body-sm text-body-sm text-on-primary hover:bg-primary-container hover:text-on-primary-container"
          onClick={() => onPlayPomodoro(firstTask?.id, block.projectId ?? undefined)}
          type="button"
        >
          <Play size={15} /> {focusLabel}
        </button>
      </div>
    </div>
  );
}
