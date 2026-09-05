"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight, Plus } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { FAB } from "@/components/ui/FAB";
import { ActiveBlockBanner } from "@/components/home/ActiveBlockBanner";
import { ActivityHeatmap } from "@/components/home/ActivityHeatmap";
import { FutureView } from "@/components/home/FutureView";
import { HomeHabitsSummary } from "@/components/home/HomeHabitsSummary";
import { QuickNotesPanel } from "@/components/home/QuickNotesPanel";
import { TodayTasksPanel, getTodayUrgentTasks } from "@/components/home/TodayTasksPanel";
import { useHabitMutations } from "@/features/habits/hooks/useHabits";
import { HabitManager } from "@/features/habits/components/HabitManager";
import { useHomeActivityQuery, useHomeOverviewQuery, useHabitsMatrixQuery } from "@/features/home/hooks/useHome";
import { useTaskMutations } from "@/features/tasks/hooks/useTasks";
import type { Task } from "@/types/entities";
import { useCapture } from "@/context/CaptureContext";

function DashboardLoading() {
  return (
    <section className="h-full overflow-y-auto bg-background p-container-padding sm:p-section-gap">
      <div className="mx-auto max-w-6xl space-y-8" aria-label="Cargando tu día" role="status">
        <div className="space-y-3">
          <div className="h-3 w-32 animate-pulse rounded-full bg-surface-container" />
          <div className="h-10 w-24 animate-pulse rounded-lg bg-surface-container" />
          <div className="h-14 w-full animate-pulse rounded-2xl bg-surface-container-low" />
        </div>
        <div className="grid gap-6 lg:grid-cols-12">
          <div className="h-64 animate-pulse rounded-2xl bg-surface-container-low lg:col-span-7" />
          <div className="h-64 animate-pulse rounded-2xl bg-surface-container-low lg:col-span-5" />
        </div>
      </div>
    </section>
  );
}

function DashboardError({ onRetry }: { onRetry: () => void }) {
  return (
    <section className="flex h-full items-center justify-center bg-background p-container-padding">
      <div className="w-full max-w-md rounded-2xl border border-error/30 bg-error-container p-6 text-center text-on-error-container">
        <p className="font-label-caps text-label-caps">NO PUDIMOS ABRIR TU DÍA</p>
        <h1 className="mt-2 font-headline-md text-headline-md font-semibold">Algo no cargó como esperábamos</h1>
        <p className="mt-2 font-body-sm text-body-sm">Puedes intentarlo de nuevo o volver a entrar en un momento.</p>
        <button className="mt-5 min-h-11 rounded-xl bg-primary px-4 font-body-sm text-body-sm text-on-primary hover:bg-primary/90" onClick={onRetry} type="button">
          Reintentar
        </button>
      </div>
    </section>
  );
}

function DashboardStartCard({ onCreateTask }: { onCreateTask: () => void }) {
  return (
    <section className="rounded-2xl border border-secondary/30 bg-surface-bright p-5 shadow-cadence-1 sm:p-6" aria-labelledby="dashboard-start-title">
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div className="max-w-2xl">
          <p className="font-label-caps text-label-caps text-secondary">EMPIEZA AQUÍ</p>
          <h2 className="mt-2 font-headline-md text-headline-md font-semibold text-on-surface" id="dashboard-start-title">Una cosa a la vez</h2>
          <p className="mt-2 font-body-md text-body-md text-on-surface-variant">No hay nada pendiente en tu día todavía. Crea una tarea y decide cuándo quieres avanzar en ella.</p>
        </div>
        <span aria-hidden="true" className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-secondary-container text-secondary">
          <Plus size={22} />
        </span>
      </div>
      <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-outline-variant pt-4">
        <button className="flex min-h-11 items-center gap-2 rounded-xl bg-primary px-4 font-body-sm text-body-sm text-on-primary hover:bg-primary/90" onClick={onCreateTask} type="button">
          <Plus size={16} /> Crear primera tarea
        </button>
        <Link className="flex min-h-11 items-center rounded-xl border border-outline-variant bg-surface px-4 font-body-sm text-body-sm text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface" href="/timeblocks">
          Configurar horario
        </Link>
      </div>
    </section>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const [habitManagerOpen, setHabitManagerOpen] = useState(false);
  const capture = useCapture();

  const overviewQuery = useHomeOverviewQuery();
  const activityQuery = useHomeActivityQuery();
  const matrixQuery = useHabitsMatrixQuery();
  const taskMutations = useTaskMutations();
  const habitMutations = useHabitMutations();

  const overview = overviewQuery.data;
  const activeBlock = overview?.activeBlock ?? null;
  const plannedTaskIds = new Set((overview?.todayTasks ?? []).map((task) => task.id));
  const urgentTasks = getTodayUrgentTasks(overview?.urgentTasks ?? [], 10).filter(
    (task) => !plannedTaskIds.has(task.id),
  );
  const habits = matrixQuery.data?.habits ?? [];
  const hasPlanning = Boolean(
    overview?.activeBlock ||
      overview?.activeEvent ||
      overview?.nextBlock ||
      overview?.blockTasks.length ||
      overview?.todayTasks.length ||
      overview?.urgentTasks.length ||
      overview?.futureTasks.length ||
      overview?.futureBlocks.length,
  );
  const firstRun = !hasPlanning && habits.length === 0;
  const hasFuture = Boolean(overview?.futureTasks.length || overview?.futureBlocks.length);
  const todayLabel = new Intl.DateTimeFormat("es-DO", {
    day: "numeric",
    month: "long",
    weekday: "long",
  }).format(new Date());

  const toggleTask = async (task: Task) => {
    try {
      await taskMutations.update.mutateAsync({
        id: task.id,
        payload: { status: task.status === "COMPLETED" ? "PENDING" : "COMPLETED" },
      });
    } catch {
      toast.error("Ups, no pudimos actualizar la tarea.");
    }
  };

  const handlePlayPomodoro = (taskId?: string, projectId?: string) => {
    const params = new URLSearchParams();
    if (taskId) params.set("taskId", taskId);
    if (projectId) params.set("projectId", projectId);
    router.push(params.toString() ? `/focus?${params.toString()}` : "/focus");
  };

  if (overviewQuery.isPending || matrixQuery.isPending) return <DashboardLoading />;
  if (overviewQuery.isError) return <DashboardError onRetry={() => void overviewQuery.refetch()} />;

  return (
    <section className="flex h-full flex-col bg-background">
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 p-container-padding pb-24 sm:gap-8 sm:px-6 sm:py-8 lg:px-10">
          <header className="space-y-4">
            <div>
              <p className="whitespace-nowrap font-label-caps text-label-caps uppercase tracking-[0.08em] text-on-surface-variant">{todayLabel}</p>
              <h1 className="mt-1 font-display-hero-mobile text-on-surface sm:font-display-hero">Hoy</h1>
              <p className="mt-2 max-w-xl font-body-md text-body-md text-on-surface-variant">Esto es lo que merece tu atención primero.</p>
            </div>
            <button
              aria-label="Crear una tarea"
              className="group flex min-h-16 w-full items-center gap-3 rounded-2xl border border-outline-variant/70 bg-surface-container-lowest px-3 text-left shadow-sm transition-colors hover:border-secondary hover:bg-surface-container-low focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary sm:px-4"
              onClick={() => capture.open("TASK")}
              type="button"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-primary-fixed bg-primary-fixed text-secondary transition-colors group-hover:bg-secondary group-hover:text-on-secondary">
                <Plus size={17} strokeWidth={2.5} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-body-md text-body-md font-medium text-on-surface">¿Qué quieres avanzar?</span>
                <span className="mt-0.5 block font-body-sm text-body-sm text-on-surface-variant">Añadir una tarea</span>
              </span>
              <span className="hidden h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-on-primary sm:flex">
                <ArrowRight size={15} />
              </span>
            </button>
          </header>

          <div className="space-y-8">
            {firstRun ? (
              <>
                <DashboardStartCard onCreateTask={() => capture.open("TASK")} />
                <QuickNotesPanel />
              </>
            ) : (
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:gap-8">
                <div className="min-w-0 lg:col-span-7">
                  <ActiveBlockBanner
                    activeEvent={overview?.activeEvent ?? null}
                    block={activeBlock}
                    nextBlock={overview?.nextBlock ?? null}
                    nextBlockStart={overview?.nextBlockStart ?? null}
                    onPlayPomodoro={handlePlayPomodoro}
                    onToggleTask={(task) => void toggleTask(task)}
                    tasks={overview?.blockTasks ?? []}
                  />
                </div>
                <div className="min-w-0 lg:col-span-5">
                  <TodayTasksPanel
                    emptyMessage="No hay prioridades pendientes. ¡Todo al día!"
                    onToggle={(task) => void toggleTask(task)}
                    plannedTasks={overview?.todayTasks ?? []}
                    tasks={urgentTasks}
                  />
                </div>
              </div>
            )}

            {!firstRun && (
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:gap-8">
                <div className="min-w-0 lg:col-span-7">
                  <HomeHabitsSummary
                    isError={matrixQuery.isError}
                    matrix={matrixQuery.data}
                    onOpenManager={() => setHabitManagerOpen(true)}
                    onRetry={() => void matrixQuery.refetch()}
                    onToggle={(habitId, date) => {
                      void habitMutations.toggleEntry.mutateAsync({ id: habitId, date });
                    }}
                  />
                </div>
                <div className="min-w-0 space-y-6 lg:col-span-5">
                  <QuickNotesPanel />
                  {hasFuture && <FutureView blocks={overview?.futureBlocks ?? []} tasks={overview?.futureTasks ?? []} />}
                </div>
              </div>
            )}
          </div>

          {!firstRun && <ActivityHeatmap activity={activityQuery.data} isLoading={activityQuery.isPending} />}
        </div>
      </div>

      <div className="sm:hidden">
        <FAB ariaLabel="Nueva tarea" onClick={() => capture.open("TASK")} raised={capture.isOpen} />
      </div>

      {habitManagerOpen && <HabitManager onClose={() => setHabitManagerOpen(false)} />}
    </section>
  );
}
