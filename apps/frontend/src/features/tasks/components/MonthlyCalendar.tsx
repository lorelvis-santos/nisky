"use client";

import { Plus } from "lucide-react";
import type { Project, Task } from "@/types/entities";
import { dateKey } from "@/lib/tasks";
import { cn, isTaskOverdue } from "@/lib/utils";

const dayNames = ["LUN", "MAR", "MIÉ", "JUE", "VIE", "SÁB", "DOM"];
const priorityDot: Record<string, string> = {
  URGENT: "bg-error",
  HIGH: "bg-tertiary",
  NORMAL: "bg-secondary",
  LOW: "bg-outline-variant",
};

const MAX_CHIPS = 4;

export function MonthlyCalendar({
  monthStart,
  tasks,
  projects,
  selectedDayKey,
  onSelectDay,
}: {
  monthStart: Date;
  tasks: Task[];
  projects: Project[];
  selectedDayKey: string | null;
  onSelectDay: (dateKey: string) => void;
}) {
  const today = dateKey(new Date());
  const projectMap = new Map(projects.map((project) => [project.id, project]));
  const year = monthStart.getFullYear();
  const month = monthStart.getMonth();
  const firstOfMonth = new Date(year, month, 1);
  const offset = (firstOfMonth.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const totalCells = Math.ceil((offset + daysInMonth) / 7) * 7;
  const weekRows = totalCells / 7;

  const cells = Array.from({ length: totalCells }, (_, index) => {
    const date = new Date(year, month, index - offset + 1);
    const inMonth = date.getMonth() === month;
    const dayTasks = tasks
      .filter((task) => task.dueDate && dateKey(task.dueDate) === dateKey(date))
      .sort((a, b) => a.order - b.order || a.createdAt.localeCompare(b.createdAt));
    return { date, inMonth, key: dateKey(date), dayTasks };
  });

  return (
    <div className="min-h-0 flex-1 overflow-auto bg-surface-container-low p-3">
      <div
        className="grid h-full min-w-[600px] grid-cols-7 gap-2"
        style={{ gridTemplateRows: `auto repeat(${weekRows}, minmax(0, 1fr))` }}
      >
        {dayNames.map((name) => (
          <div
            className="border-b border-outline-variant py-1 text-center font-data-mono text-data-mono text-xs text-on-surface-variant"
            key={name}
          >
            {name}
          </div>
        ))}
        {cells.map(({ date, key, inMonth, dayTasks }) => {
          const isToday = key === today;
          const isSelected = key === selectedDayKey;
          const visible = dayTasks.slice(0, MAX_CHIPS);
          const extra = Math.max(dayTasks.length - MAX_CHIPS, 0);
          return (
            <div
              className={cn(
                "flex min-h-0 min-w-0 cursor-pointer flex-col border border-outline-variant bg-surface-container-lowest p-1.5 transition-colors hover:border-primary hover:bg-secondary-container/10",
                !inMonth && "opacity-50",
                isToday && "border-t-2 border-primary bg-secondary-container/20",
                isSelected && "border-2 border-primary",
              )}
              key={key}
              onClick={() => onSelectDay(key)}
            >
              <button
                aria-label={`Ver las tareas del ${date.toLocaleDateString("es-CO", { day: "numeric", month: "short" })}`}
                aria-pressed={isSelected}
                className={cn(
                  "flex w-full shrink-0 items-center justify-between py-0.5 font-data-mono text-data-mono text-xs",
                  inMonth ? "text-on-surface-variant hover:text-primary" : "text-outline",
                  (isToday || isSelected) && "font-bold text-primary",
                )}
                onClick={() => onSelectDay(key)}
                type="button"
              >
                {date.getDate()}
                <Plus
                  className={cn("text-outline", dayTasks.length === 0 ? "opacity-0 max-md:opacity-100" : "opacity-100")}
                  size={12}
                />
              </button>
              <div className="flex min-h-0 flex-col gap-1 overflow-hidden">
                {visible.map((task) => {
                  const completed = task.status === "COMPLETED";
                  const overdue = isTaskOverdue(task);
                  const project = task.projectId ? projectMap.get(task.projectId) : undefined;
                  return (
                    <button
                      aria-label={`${completed ? "Completada: " : ""}${task.title}`}
                      className={cn(
                        "flex min-w-0 items-center gap-1 border border-outline-variant bg-surface px-1 py-0.5 text-left hover:border-primary hover:bg-primary-container/20",
                        completed && "opacity-60",
                      )}
                      key={task.id}
                      onClick={() => onSelectDay(key)}
                      style={project ? { borderLeftColor: project.color, borderLeftWidth: "3px" } : undefined}
                      title={project ? `${task.title} · ${project.name}` : task.title}
                      type="button"
                    >
                      {overdue || !project ? (
                        <span
                          className={cn("h-1.5 w-1.5 shrink-0 rounded-full", overdue ? "bg-error" : priorityDot[task.priority])}
                        />
                      ) : null}
                      <span className={cn("truncate font-body-sm text-body-sm leading-4 text-on-surface", completed && "line-through")}>
                        {task.title}
                      </span>
                    </button>
                  );
                })}
                {extra > 0 && (
                  <button
                    className="flex min-w-0 items-center gap-1 border border-dashed border-outline-variant px-1 py-0.5 text-left font-body-sm text-body-sm leading-4 text-on-surface-variant hover:border-primary hover:text-primary"
                    onClick={() => onSelectDay(key)}
                    type="button"
                  >
                    <Plus size={12} /> {extra} más
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}