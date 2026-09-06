"use client";

import {
  AlertCircle,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Circle,
  Inbox,
  MessageSquare,
} from "lucide-react";
import Link from "next/link";
import { localDateKey } from "@/lib/utils";
import type { HomeScheduledTask, Task } from "@/types/entities";

const priorityRank = { URGENT: 0, HIGH: 1, NORMAL: 2, LOW: 3 } as const;

export function getTodayUrgentTasks(tasks: Task[], limit = 5) {
  const todayKey = localDateKey(new Date());
  const byPriority = (a: Task, b: Task) =>
    priorityRank[a.priority] - priorityRank[b.priority];
  const overdue = tasks
    .filter(
      (task) =>
        task.status === "PENDING" &&
        task.dueDate &&
        localDateKey(task.dueDate) < todayKey,
    )
    .sort((a, b) => (a.dueDate ?? "").localeCompare(b.dueDate ?? ""));
  const today = tasks
    .filter(
      (task) =>
        task.status === "PENDING" &&
        task.dueDate &&
        localDateKey(task.dueDate) === todayKey,
    )
    .sort(byPriority);
  const highNoDate = tasks
    .filter(
      (task) =>
        task.status === "PENDING" && !task.dueDate && task.priority === "HIGH",
    )
    .sort(byPriority);
  return [...overdue, ...today, ...highNoDate].slice(0, limit);
}

function dueBadge(task: Task) {
  const todayKey = localDateKey(new Date());
  const overdue = task.dueDate && localDateKey(task.dueDate) < todayKey;
  const today = task.dueDate && localDateKey(task.dueDate) === todayKey;
  if (!task.dueDate) return null;
  return (
    <span
      className={`inline-flex items-center gap-1 whitespace-nowrap rounded-md px-2 py-0.5 font-data-mono text-[11px] font-medium ${overdue ? "bg-error-container text-error" : today ? "bg-secondary-fixed text-secondary" : "bg-surface-container-low text-on-surface-variant"}`}
    >
      {overdue ? <AlertCircle size={12} /> : <CalendarDays size={12} />}
      {overdue ? "Atrasada" : today ? "Hoy" : localDateKey(task.dueDate)}
    </span>
  );
}

function priorityBadge(task: Task) {
  if (task.dueDate || (task.priority !== "HIGH" && task.priority !== "URGENT")) return null;
  return (
    <span className="inline-flex items-center rounded-md bg-warning-container px-2 py-0.5 font-data-mono text-[11px] font-medium text-on-warning-container">
      {task.priority === "URGENT" ? "Urgente" : "Alta"}
    </span>
  );
}

function TodayTaskRow({
  task,
  onToggle,
}: {
  task: Task | HomeScheduledTask;
  onToggle: (task: Task) => void;
}) {
  return (
    <div className="group flex items-start gap-3 rounded-lg border border-outline-variant/60 bg-surface-container-lowest p-3 shadow-sm transition-colors hover:border-outline hover:bg-surface-container-low">
      <button
        aria-label={`Completar ${task.title}`}
        aria-pressed={task.status === "COMPLETED"}
        className="-ml-2 -mt-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-outline hover:text-secondary"
        onClick={() => onToggle(task)}
        type="button"
      >
        {task.status === "COMPLETED" ? (
          <CheckCircle2 className="text-tertiary" size={18} />
        ) : (
          <Circle size={18} />
        )}
      </button>
      <Link
        className="min-w-0 flex-1"
        href={`/tasks?taskId=${encodeURIComponent(task.id)}`}
      >
        <p className={`line-clamp-2 break-words font-body-md text-body-md font-medium hover:text-primary ${task.status === "COMPLETED" ? "text-on-surface-variant line-through" : "text-on-surface"}`}>
          {task.title}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5">
          {dueBadge(task)}
          {task.project && (
            <span className="inline-flex max-w-[8rem] items-center gap-1 font-data-mono text-data-mono text-[11px] text-on-surface-variant" title={task.project.name}>
              <span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: task.project.color }} />
              <span className="truncate">{task.project.name}</span>
            </span>
          )}
          {priorityBadge(task)}
          {(task.commentCount ?? 0) > 0 && (
            <span className="flex items-center gap-1 font-data-mono text-data-mono text-[11px] text-on-surface-variant" title="Comentarios">
              <MessageSquare size={11} /> {task.commentCount}
            </span>
          )}
          {"scheduleState" in task && task.scheduleState === "REPLAN" && (
            <span className="inline-flex items-center rounded-md bg-error-container px-2 py-0.5 font-label-caps text-[10px] uppercase text-error">Replanificar</span>
          )}
        </div>
      </Link>
    </div>
  );
}

export function TodayTasksPanel({
  tasks,
  plannedTasks = [],
  onToggle,
  emptyMessage = "Nada pendiente. ¡Todo al día!",
}: {
  tasks: Task[];
  plannedTasks?: HomeScheduledTask[];
  onToggle: (task: Task) => void;
  emptyMessage?: string;
}) {
  const allTasks = [...plannedTasks, ...tasks];
  const totalTasks = allTasks.length;

  return (
    <section className="space-y-3">
      <header className="flex items-center justify-between gap-3 px-1">
        <div className="flex items-center gap-2">
          <h2 className="font-headline-xs text-headline-xs font-bold text-on-surface">Por hacer</h2>
          <span className="font-data-mono text-data-mono text-xs text-on-surface-variant">{totalTasks} tareas</span>
        </div>
        <Link
          className="flex shrink-0 items-center gap-1 font-label-caps text-label-caps text-primary hover:underline"
          href="/tasks"
        >
          VER TODAS <ArrowRight size={13} />
        </Link>
      </header>
      {totalTasks === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-outline-variant bg-surface-container-lowest px-4 py-10 text-center font-body-sm text-body-sm text-on-surface-variant shadow-sm">
          <Inbox size={20} className="text-outline" />
          {emptyMessage}
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          {allTasks.map((task) => (
            <TodayTaskRow key={task.id} onToggle={onToggle} task={task} />
          ))}
        </div>
      )}
    </section>
  );
}
