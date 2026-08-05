"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, CheckSquare2, Circle, Timer } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthProvider";
import { HabitManager } from "@/features/habits/components/HabitManager";
import { HabitRow } from "@/features/habits/components/HabitRow";
import {
  useHabitMutations,
  useHabitsQuery,
} from "@/features/habits/hooks/useHabits";
import { QuickCapture } from "@/features/quicknotes/components/QuickCapture";
import type { DetectedDate } from "@/features/quicknotes/utils/detectDate";
import { PriorityChip } from "@/features/tasks/components/PriorityChip";
import {
  useTaskMutations,
  useTasksQuery,
} from "@/features/tasks/hooks/useTasks";
import { formatRelativeDate, isTaskOverdue } from "@/lib/utils";
import type { QuickNote, Task } from "@/types/entities";

function localDateKey() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function dayKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function weekDaysFromToday() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + ((7 - end.getDay()) % 7));
  const days: Date[] = [];
  for (let current = new Date(start); current <= end; current.setDate(current.getDate() + 1)) {
    days.push(new Date(current));
  }
  return days;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [habitManagerOpen, setHabitManagerOpen] = useState(false);
  const tasksQuery = useTasksQuery({
    limit: 100,
    sort: "priority",
    order: "desc",
  });
  const taskMutations = useTaskMutations();
  const habitsQuery = useHabitsQuery({ includeArchived: false });
  const habitMutations = useHabitMutations();
  const activeHabits = (habitsQuery.data ?? []).filter(
    (habit) => !habit.archived,
  );
  const tasks = (tasksQuery.data?.data ?? []).filter(
    (task) => task.status !== "COMPLETED" && task.status !== "CANCELLED",
  );
  const todayKey = localDateKey();
  const days = weekDaysFromToday();
  const tasksByDay = (day: Date) => {
    const key = dayKey(day);
    const dayTasks = tasks.filter((task) => task.dueDate && task.dueDate.slice(0, 10) === key);
    if (key !== todayKey) return dayTasks;
    const overdue = tasks.filter((task) => task.dueDate && task.dueDate.slice(0, 10) < key);
    return [...overdue, ...dayTasks];
  };
  const dayLabel = (day: Date) => {
    const diff = Math.round((day.getTime() - days[0].getTime()) / 86_400_000);
    if (diff === 0) return "HOY";
    if (diff === 1) return "MAÑANA";
    if (diff === 2) return "PASADO MAÑANA";
    return day.toLocaleDateString("es-CO", { weekday: "long" }).toUpperCase();
  };
  const dayDateLine = (day: Date) => day.toLocaleDateString("es-CO", { day: "2-digit", month: "long", year: "numeric" });
  const weekLabel = days.length === 1
    ? dayDateLine(days[0])
    : `${days[0].toLocaleDateString("es-CO", { day: "2-digit", month: "long" })} — ${days[days.length - 1].toLocaleDateString("es-CO", { day: "2-digit", month: "long", year: "numeric" })}`;

  const toggleTask = async (task: Task) => {
    try {
      await taskMutations.update.mutateAsync({
        id: task.id,
        payload: {
          status: task.status === "COMPLETED" ? "PENDING" : "COMPLETED",
        },
      });
    } catch {
      toast.error("Ups, no pudimos actualizar la tarea.");
    }
  };

  const convertToTask = (note: QuickNote, detected: DetectedDate | null) => {
    const prefill = encodeURIComponent(
      JSON.stringify({ title: note.content, dueDate: detected?.isoDate ?? "" }),
    );
    router.push(
      `/tasks?modal=create&prefill=${prefill}&quickNoteId=${encodeURIComponent(note.id)}`,
    );
  };

  return (
    <section className="h-full overflow-y-auto bg-background p-container-padding">
      <div className="flex flex-col gap-section-gap">
        <div className="flex flex-col gap-1 border-b border-outline-variant pb-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="font-label-caps text-label-caps uppercase text-on-surface-variant">
              MI SEMANA
            </p>
            <h1 className="mt-1 font-headline-sm text-headline-sm text-primary">
              Hola, {user?.name ?? "usuario"}
            </h1>
          </div>
        </div>

        <div className="grid grid-cols-1 items-start gap-section-gap lg:grid-cols-12">
          <section className="lg:col-span-8">
            <div className="border border-outline-variant bg-surface-container-lowest">
              <div className="flex items-center justify-between border-b border-outline-variant bg-surface-container-low p-container-padding">
                <div>
                  <p className="font-label-caps text-label-caps uppercase text-on-surface-variant">
                    Tu semana
                  </p>
                  <h2 className="mt-1 font-headline-xs text-headline-xs">
                    {weekLabel}
                  </h2>
                </div>
                <Link
                  className="flex items-center gap-1 font-label-caps text-label-caps text-primary hover:text-primary-container"
                  href="/tasks"
                >
                  VER TODAS <ArrowRight size={14} />
                </Link>
              </div>
              <div>
                {tasksQuery.isLoading ? (
                  <p className="p-container-padding font-body-sm text-body-sm text-on-surface-variant">
                    Cargando tus tareas...
                  </p>
                ) : tasksQuery.isError ? (
                  <div className="flex flex-col gap-3 p-container-padding">
                    <p className="font-body-sm text-body-sm text-error">
                      Ups, no pudimos cargar tus tareas. Inténtalo de nuevo.
                    </p>
                    <Link
                      className="font-body-sm text-body-sm text-primary underline"
                      href="/tasks"
                    >
                      Ir a mis tareas
                    </Link>
                  </div>
                ) : tasks.length === 0 ? (
                  <div className="flex flex-col gap-2 p-container-padding">
                    <p className="font-body-md text-body-md">
                      Tu semana está despejada. ¡Sin tareas pendientes!
                    </p>
                    <Link
                      className="font-body-sm text-body-sm text-primary underline"
                      href="/tasks"
                    >
                      Crear una tarea
                    </Link>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3 p-container-padding">
                    {days.map((day) => {
                      const dayTasks = tasksByDay(day);
                      return (
                        <div className="border border-outline-variant" key={dayKey(day)}>
                          <div className="flex items-start justify-between gap-3 border-b border-outline-variant bg-surface-container-low px-4 py-3">
                            <div>
                              <p className={`font-label-caps text-label-caps ${dayTasks.length > 0 ? "text-primary" : "text-on-surface-variant"}`}>
                                {dayLabel(day)}
                              </p>
                              <p className="mt-0.5 font-data-mono text-data-mono text-xs text-on-surface-variant">
                                {dayDateLine(day)}
                              </p>
                            </div>
                            {dayTasks.length > 0 && (
                              <span className="shrink-0 font-data-mono text-data-mono text-xs text-on-surface-variant">
                                {dayTasks.length} {dayTasks.length === 1 ? "tarea" : "tareas"}
                              </span>
                            )}
                          </div>
                          {dayTasks.length === 0 ? (
                            <p className="px-4 py-3 font-body-sm text-body-sm text-on-surface-variant">
                              Nada planeado
                            </p>
                          ) : (
                            dayTasks.map((task) => (
                              <DashboardTask
                                key={task.id}
                                onToggle={() => void toggleTask(task)}
                                task={task}
                              />
                            ))
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </section>

          <section className="flex flex-col gap-section-gap lg:col-span-4">
            <div className="border border-outline-variant bg-surface-container-lowest">
              <div className="flex items-center justify-between border-b border-outline-variant bg-surface-container-low p-container-padding">
                <h2 className="font-headline-xs text-headline-xs">
                  Registro de hábitos
                </h2>
                <button
                  className="font-label-caps text-label-caps text-primary hover:underline"
                  onClick={() => setHabitManagerOpen(true)}
                  type="button"
                >
                  EDITAR
                </button>
              </div>
              <div className="flex flex-col gap-1 p-2">
                {habitsQuery.isLoading ? (
                  <p className="p-2 font-body-sm text-body-sm text-on-surface-variant">
                    Cargando tus hábitos...
                  </p>
                ) : habitsQuery.isError ? (
                  <p className="p-2 font-body-sm text-body-sm text-error">
                    Ups, no pudimos cargar tus hábitos. Inténtalo de nuevo.
                  </p>
                ) : activeHabits.length === 0 ? (
                  <div className="flex flex-col gap-2 p-2">
                    <p className="font-body-sm text-body-sm text-on-surface-variant">
                      Aún no tienes hábitos. ¡Crea el primero!
                    </p>
                    <button
                      className="self-start font-body-sm text-body-sm text-primary underline"
                      onClick={() => setHabitManagerOpen(true)}
                      type="button"
                    >
                      Crear hábito
                    </button>
                  </div>
                ) : (
                  activeHabits.map((habit) => (
                    <HabitRow
                      key={habit.id}
                      habit={habit}
                      onToggle={() =>
                        void habitMutations.toggleEntry.mutateAsync({
                          id: habit.id,
                          date: todayKey,
                        })
                      }
                    />
                  ))
                )}
              </div>
            </div>

            <div className="flex min-h-[250px] flex-col border border-outline-variant bg-surface-container-lowest">
              <div className="border-b border-outline-variant bg-surface-container-low p-container-padding">
                <h2 className="font-headline-xs text-headline-xs">
                  Captura rápida
                </h2>
              </div>
              <QuickCapture onConvertToTask={convertToTask} />
            </div>
          </section>
        </div>
      </div>
      {habitManagerOpen && (
        <HabitManager onClose={() => setHabitManagerOpen(false)} />
      )}
    </section>
  );
}

function DashboardTask({
  task,
  onToggle,
}: {
  task: Task;
  onToggle: () => void;
}) {
  const overdue = isTaskOverdue(task);
  const subtaskTotal = task.subtaskCount ?? task.subtasks?.length ?? 0;
  const completedSubtasks = task.completedSubtasks ?? task.subtasks?.filter((subtask) => subtask.completed).length ?? 0;
  return (
    <div
      className={`group flex items-start justify-between gap-3 border-b border-outline-variant px-4 py-3 transition-colors last:border-b-0 hover:bg-surface-container-low ${overdue ? "border-l-2 border-l-error" : ""}`}
    >
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <button
          aria-label={`Completar ${task.title}`}
          className="mt-0.5 shrink-0 text-outline hover:text-primary"
          onClick={onToggle}
          type="button"
        >
          <Circle size={18} />
        </button>
        <div className="min-w-0">
          <Link
            className="block line-clamp-2 break-words font-body-md text-body-md font-medium hover:text-primary"
            href={`/tasks?taskId=${encodeURIComponent(task.id)}`}
          >
            {task.title}
          </Link>
          {task.dueDate && (
            <p
              className={`mt-1 font-data-mono text-data-mono text-xs ${overdue ? "text-error" : "text-on-surface-variant"}`}
            >
              {overdue ? "Vencida: " : "Vence "}
              {formatRelativeDate(task.dueDate, true)}
            </p>
          )}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <span className="flex items-center gap-1 font-data-mono text-data-mono text-xs text-tertiary" title="Pomodoros"><Timer size={13} /> {task.pomodoroCount ?? 0}/{task.pomodoroEstimate ?? 0}</span>
        {subtaskTotal > 0 && <span className="flex items-center gap-1 font-data-mono text-data-mono text-xs text-secondary" title="Subtareas"><CheckSquare2 size={13} /> {completedSubtasks}/{subtaskTotal}</span>}
        <PriorityChip priority={task.priority} />
        <Link
          aria-label={`Ver detalle de ${task.title}`}
          className="flex h-7 w-7 items-center justify-center border border-outline-variant text-on-surface-variant hover:border-outline hover:bg-surface-container-high hover:text-primary"
          href={`/tasks?taskId=${encodeURIComponent(task.id)}`}
          title="Ver detalle"
        >
          <ArrowRight size={15} />
        </Link>
      </div>
    </div>
  );
}
