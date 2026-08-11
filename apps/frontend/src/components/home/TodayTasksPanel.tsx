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
import type { Task } from "@/types/entities";

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
      className={`flex items-center gap-1 whitespace-nowrap font-data-mono text-data-mono text-xs ${overdue ? "text-error" : "text-on-surface-variant"}`}
    >
      {overdue ? <AlertCircle size={12} /> : <CalendarDays size={12} />}
      {overdue ? "Atrasada" : today ? "Hoy" : localDateKey(task.dueDate)}
    </span>
  );
}

function TodayTaskRow({
  task,
  onToggle,
}: {
  task: Task;
  onToggle: (task: Task) => void;
}) {
  return (
    <div className="group flex items-start gap-3 border-b border-outline-variant px-4 py-3 transition-colors last:border-b-0 hover:bg-surface-container-low">
      <button
        aria-label={`Completar ${task.title}`}
        className="mt-0.5 shrink-0 text-outline hover:text-primary"
        onClick={() => onToggle(task)}
        type="button"
      >
        {task.status === "COMPLETED" ? (
          <CheckCircle2 className="text-primary" size={18} />
        ) : (
          <Circle size={18} />
        )}
      </button>
      <Link
        className="min-w-0 flex-1"
        href={`/tasks?taskId=${encodeURIComponent(task.id)}`}
      >
        <p className="line-clamp-2 break-words font-body-md text-body-md font-medium hover:text-primary">
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
          {(task.commentCount ?? 0) > 0 && (
            <span className="flex items-center gap-1 font-data-mono text-data-mono text-[11px] text-on-surface-variant" title="Comentarios">
              <MessageSquare size={11} /> {task.commentCount}
            </span>
          )}
        </div>
      </Link>
    </div>
  );
}

export function TodayTasksPanel({
  tasks,
  onToggle,
  emptyMessage = "Nada pendiente. ¡Todo al día!",
}: {
  tasks: Task[];
  onToggle: (task: Task) => void;
  emptyMessage?: string;
}) {
  const todayKey = localDateKey(new Date());
  const overdue = tasks.filter(
    (task) =>
      task.dueDate &&
      localDateKey(task.dueDate) < todayKey &&
      task.status === "PENDING",
  );
  const today = tasks.filter(
    (task) =>
      task.dueDate &&
      localDateKey(task.dueDate) === todayKey &&
      task.status === "PENDING",
  );
  const highPriority = tasks.filter(
    (task) =>
      !task.dueDate && task.priority === "HIGH" && task.status === "PENDING",
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center justify-between gap-2 border-b border-outline-variant bg-surface-bright px-4 py-3">
        <div>
          <h2 className="font-headline-xs text-headline-xs font-bold text-primary">
            Por hacer hoy ({tasks.length})
          </h2>
          <p className="mt-0.5 font-body-sm text-body-sm text-on-surface-variant">
            Lo que vence hoy y lo ya vencido.
          </p>
        </div>
        <Link
          className="flex items-center gap-1 font-label-caps text-label-caps text-primary hover:underline"
          href="/tasks"
        >
          VER TODOS <ArrowRight size={13} />
        </Link>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {tasks.length === 0 ? (
          <p className="flex flex-col items-center gap-2 px-4 py-8 text-center font-body-sm text-body-sm text-on-surface-variant">
            <Inbox size={20} className="text-outline" />
            {emptyMessage}
          </p>
        ) : (
          <>
            {overdue.length > 0 && (
              <div>
                <p className="flex items-center gap-1.5 px-4 pt-3 font-label-caps text-label-caps text-error">
                  <AlertCircle size={12} /> ATRASADAS ({overdue.length})
                </p>
                {overdue.map((task) => (
                  <TodayTaskRow key={task.id} onToggle={onToggle} task={task} />
                ))}
              </div>
            )}
            {today.length > 0 && (
              <div>
                <p className="flex items-center gap-1.5 px-4 pt-3 font-label-caps text-label-caps text-on-surface-variant">
                  <CalendarDays size={12} /> VENCEN HOY ({today.length})
                </p>
                {today.map((task) => (
                  <TodayTaskRow key={task.id} onToggle={onToggle} task={task} />
                ))}
              </div>
            )}
            {highPriority.length > 0 && (
              <div>
                <p className="flex items-center gap-1.5 px-4 pt-3 font-label-caps text-label-caps text-on-surface-variant">
                  ALTA PRIORIDAD ({highPriority.length})
                </p>
                {highPriority.map((task) => (
                  <TodayTaskRow key={task.id} onToggle={onToggle} task={task} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
