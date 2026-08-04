"use client";

import Link from "next/link";
import { ArrowRight, CheckCircle2, Circle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthProvider";
import { PriorityChip } from "@/features/tasks/components/PriorityChip";
import {
  useTaskMutations,
  useTasksQuery,
} from "@/features/tasks/hooks/useTasks";
import { formatRelativeDate } from "@/lib/utils";
import type { Task } from "@/types/entities";

const habitItems = [
  { id: "review", label: "Revisión de código" },
  { id: "reading", label: "Lectura (30 min)" },
  { id: "workout", label: "Ejercicio" },
];

export default function DashboardPage() {
  const { user } = useAuth();
  const [habits, setHabits] = useState<Record<string, boolean>>({});
  const [quickNote, setQuickNote] = useState("");
  const tasksQuery = useTasksQuery({
    limit: 100,
    sort: "priority",
    order: "desc",
  });
  const mutations = useTaskMutations();
  const tasks = (tasksQuery.data?.data ?? [])
    .filter(
      (task) => task.status !== "COMPLETED" && task.status !== "CANCELLED",
    )
    .slice(0, 8);
  const today = new Date().toLocaleDateString("es-CO", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  const toggleTask = async (task: Task) => {
    try {
      await mutations.update.mutateAsync({
        id: task.id,
        payload: {
          status: task.status === "COMPLETED" ? "PENDING" : "COMPLETED",
        },
      });
    } catch {
      toast.error("No se pudo actualizar la tarea");
    }
  };

  return (
    <section className="h-full overflow-y-auto bg-background p-container-padding sm:p-section-gap">
      <div className="mx-auto flex max-w-7xl flex-col gap-section-gap">
        <div className="flex flex-col gap-1 border-b border-outline-variant pb-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="font-label-caps text-label-caps uppercase text-on-surface-variant">
              PANEL DE OPERACIONES
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
                    Hoy
                  </p>
                  <h2 className="mt-1 font-headline-xs text-headline-xs">
                    {today}
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
                    Cargando tareas...
                  </p>
                ) : tasksQuery.isError ? (
                  <div className="flex flex-col gap-3 p-container-padding">
                    <p className="font-body-sm text-body-sm text-error">
                      No se pudieron cargar las tareas.
                    </p>
                    <Link
                      className="font-body-sm text-body-sm text-primary underline"
                      href="/tasks"
                    >
                      Abrir planificación
                    </Link>
                  </div>
                ) : tasks.length === 0 ? (
                  <div className="flex flex-col gap-2 p-container-padding">
                    <p className="font-body-md text-body-md">
                      No hay tareas activas.
                    </p>
                    <Link
                      className="font-body-sm text-body-sm text-primary underline"
                      href="/tasks"
                    >
                      Crear una tarea
                    </Link>
                  </div>
                ) : (
                  tasks.map((task) => (
                    <DashboardTask
                      key={task.id}
                      onToggle={() => void toggleTask(task)}
                      task={task}
                    />
                  ))
                )}
              </div>
            </div>
          </section>

          <section className="flex flex-col gap-section-gap lg:col-span-4">
            <div className="border border-outline-variant bg-surface-container-lowest">
              <div className="border-b border-outline-variant bg-surface-container-low p-container-padding">
                <h2 className="font-headline-xs text-headline-xs">
                  Registro de hábitos
                </h2>
              </div>
              <div className="flex flex-col gap-1 p-2">
                {habitItems.map((habit) => (
                  <label
                    className="flex cursor-pointer items-center gap-3 px-2 py-2 hover:bg-surface-container-low"
                    key={habit.id}
                  >
                    <input
                      checked={Boolean(habits[habit.id])}
                      className="h-4 w-4 accent-primary"
                      onChange={(event) =>
                        setHabits((current) => ({
                          ...current,
                          [habit.id]: event.target.checked,
                        }))
                      }
                      type="checkbox"
                    />
                    <span className="font-body-sm text-body-sm">
                      {habit.label}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex min-h-[250px] flex-col border border-outline-variant bg-surface-container-lowest">
              <div className="border-b border-outline-variant bg-surface-container-low p-container-padding">
                <h2 className="font-headline-xs text-headline-xs">
                  Captura rápida
                </h2>
              </div>
              <div className="flex flex-1 flex-col gap-3 p-3">
                <textarea
                  aria-label="Nota rápida"
                  className="min-h-32 flex-1 resize-none border-0 bg-transparent p-0 font-body-sm text-body-sm text-on-surface outline-none placeholder:text-on-surface-variant focus:ring-0"
                  onChange={(event) => setQuickNote(event.target.value)}
                  placeholder="Escribe aquí una nota rápida..."
                  value={quickNote}
                />
                <div className="flex items-center justify-between gap-3 border-t border-outline-variant pt-3">
                  <span className="font-body-sm text-body-sm text-on-surface-variant">
                    {quickNote.length > 0
                      ? `${quickNote.length} caracteres`
                      : "Sin nota guardada"}
                  </span>
                  <Link
                    className="bg-primary-container px-3 py-2 font-body-sm text-body-sm text-on-primary hover:bg-primary"
                    href="/journal"
                  >
                    Abrir diario
                  </Link>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
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
  return (
    <div className="group flex items-start justify-between gap-3 border-b border-outline-variant px-4 py-3 transition-colors last:border-b-0 hover:bg-surface-container-low">
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <button
          aria-label={`Completar ${task.title}`}
          className="mt-0.5 shrink-0 text-outline hover:text-primary"
          onClick={onToggle}
          type="button"
        >
          {task.status === "COMPLETED" ? (
            <CheckCircle2 size={18} />
          ) : (
            <Circle size={18} />
          )}
        </button>
        <div className="min-w-0">
          <Link
            className="block line-clamp-2 break-words font-body-md text-body-md font-medium hover:text-primary"
            href={`/tasks?taskId=${encodeURIComponent(task.id)}`}
          >
            {task.title}
          </Link>
          {task.dueDate && (
            <p className="mt-1 font-data-mono text-data-mono text-xs text-on-surface-variant">
              Vence {formatRelativeDate(task.dueDate, true)}
            </p>
          )}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
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
