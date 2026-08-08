"use client";

import { AlertCircle, ArrowRight, CalendarDays, CheckCircle2, Circle, Inbox } from "lucide-react";
import Link from "next/link";
import { localDateKey } from "@/lib/utils";
import type { Task } from "@/types/entities";

export function getUrgentRecados(tasks: Task[], limit = 5) {
  const todayKey = localDateKey(new Date());
  const priorityRank = { URGENT: 0, HIGH: 1, NORMAL: 2, LOW: 3 } as const;
  const byPriority = (a: Task, b: Task) => priorityRank[a.priority] - priorityRank[b.priority];
  const overdue = tasks
    .filter((task) => task.status === "PENDING" && task.dueDate && localDateKey(task.dueDate) < todayKey)
    .sort((a, b) => (a.dueDate ?? "").localeCompare(b.dueDate ?? ""));
  const today = tasks
    .filter((task) => task.status === "PENDING" && task.dueDate && localDateKey(task.dueDate) === todayKey)
    .sort(byPriority);
  const highNoDate = tasks.filter((task) => task.status === "PENDING" && !task.dueDate && task.priority === "HIGH").sort(byPriority);
  return [...overdue, ...today, ...highNoDate].slice(0, limit);
}

function dueBadge(task: Task) {
  const todayKey = localDateKey(new Date());
  const overdue = task.dueDate && localDateKey(task.dueDate) < todayKey;
  const today = task.dueDate && localDateKey(task.dueDate) === todayKey;
  if (!task.dueDate) return null;
  return (
    <span className={`flex items-center gap-1 whitespace-nowrap font-data-mono text-data-mono text-xs ${overdue ? "text-error" : "text-on-surface-variant"}`}>
      {overdue ? <AlertCircle size={12} /> : <CalendarDays size={12} />}
      {overdue ? "Atrasada" : today ? "Hoy" : localDateKey(task.dueDate)}
    </span>
  );
}

export function RecadosPanel({
  tasks,
  limit = 5,
  onToggle,
  emptyMessage = "Nada pendiente. ¡Todo al día!",
}: {
  tasks: Task[];
  limit?: number;
  onToggle: (task: Task) => void;
  emptyMessage?: string;
}) {
  const recados = getUrgentRecados(tasks, limit);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center justify-between gap-2 border-b border-outline-variant bg-surface-bright px-4 py-3">
        <h2 className="font-headline-xs text-headline-xs font-bold text-primary">
          Por hacer ({recados.length})
        </h2>
        <Link className="flex items-center gap-1 font-label-caps text-label-caps text-primary hover:underline" href="/tasks">
          VER TODOS <ArrowRight size={13} />
        </Link>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {recados.length === 0 ? (
          <p className="flex flex-col items-center gap-2 px-4 py-8 text-center font-body-sm text-body-sm text-on-surface-variant">
            <Inbox size={20} className="text-outline" />
            {emptyMessage}
          </p>
        ) : (
          recados.map((task) => (
            <div className="group flex items-start gap-3 border-b border-outline-variant px-4 py-3 transition-colors last:border-b-0 hover:bg-surface-container-low" key={task.id}>
              <button
                aria-label={`Completar ${task.title}`}
                className="mt-0.5 shrink-0 text-outline hover:text-primary"
                onClick={() => onToggle(task)}
                type="button"
              >
                {task.status === "COMPLETED" ? <CheckCircle2 className="text-primary" size={18} /> : <Circle size={18} />}
              </button>
              <Link className="min-w-0 flex-1" href={`/tasks?taskId=${encodeURIComponent(task.id)}`}>
                <p className="line-clamp-2 break-words font-body-md text-body-md font-medium hover:text-primary">{task.title}</p>
                {dueBadge(task)}
              </Link>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
