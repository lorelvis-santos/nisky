"use client";

import { AlertCircle, CalendarDays, CheckCircle2, ChevronDown, Circle, ListChecks, Play } from "lucide-react";
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
  tasks,
  onPlayPomodoro,
  onToggleTask,
}: {
  block: TimeBlockWithProject | null;
  tasks: Task[];
  onPlayPomodoro: (taskId?: string) => void;
  onToggleTask: (task: Task) => void;
}) {
  const [open, setOpen] = useState(false);
  const nowMin = useNowMinutes();

  if (!block) {
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

  const label = block.project?.name ?? block.name ?? "Bloque de enfoque";
  const color = block.project?.color ?? "#303e51";
  const remaining = Math.max(0, block.endMin - nowMin);
  const firstTask = tasks[0];

  return (
    <div className="flex flex-col gap-2 border border-outline-variant bg-surface-container-lowest px-container-padding py-3 sm:px-4">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <div className="flex min-w-0 items-center gap-2">
          <span aria-hidden="true" className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: color }} />
          <p className="truncate font-headline-xs text-headline-xs font-bold" style={{ color }}>
            {label}
          </p>
          <p className="shrink-0 font-data-mono text-data-mono text-xs text-on-surface-variant">
            {minToTime(block.startMin)}–{minToTime(block.endMin)}
          </p>
        </div>
        <p className="font-data-mono text-data-mono text-sm text-primary">Quedan {formatDuration(remaining)}</p>
        <div className="ml-auto flex items-center gap-3">
          <Link className="font-label-caps text-label-caps text-primary hover:underline" href="/timeblocks">
            VER AGENDA
          </Link>
          <button
            className="flex h-9 items-center gap-2 border border-outline-variant bg-primary px-4 font-body-sm text-body-sm text-on-primary hover:bg-primary-container hover:text-on-primary-container"
            onClick={() => onPlayPomodoro(firstTask?.id)}
            type="button"
          >
            <Play size={15} /> {firstTask ? "Enfocarme ahora" : "Comenzar enfoque"}
          </button>
        </div>
      </div>

      {tasks.length > 0 && (
        <div className="border-t border-outline-variant pt-1.5">
          <button
            aria-expanded={open}
            className="flex w-full items-center gap-1.5 py-1 font-label-caps text-label-caps text-on-surface-variant hover:text-on-surface"
            onClick={() => setOpen((value) => !value)}
            type="button"
          >
            <ListChecks size={13} />
            TAREAS DEL BLOQUE ({tasks.length})
            <ChevronDown size={13} className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
          </button>
          {open && (
            <ul className="flex flex-col divide-y divide-outline-variant">
              {tasks.slice(0, 5).map((task) => (
                <li className="flex items-center gap-2 py-1.5" key={task.id}>
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
                  <PriorityChip priority={task.priority} />
                  {dueBadge(task)}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
