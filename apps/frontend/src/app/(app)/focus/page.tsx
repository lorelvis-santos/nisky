"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, Settings, Timer } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import type {
  PomodoroPhase,
  PomodoroSession,
  PomodoroSettings,
} from "@/types/entities";
import { TaskFocusDetails } from "@/features/pomodoro/components/TaskFocusDetails";
import { useTaskMutations, useTaskQuery, useTasksQuery } from "@/features/tasks/hooks/useTasks";
import { useProjectsQuery } from "@/features/projects/hooks/useProjects";
import { useActiveBlockQuery } from "@/features/timeblocks/hooks/useTimeBlocks";
import { Controls } from "@/features/pomodoro/components/Controls";
import { SessionList } from "@/features/pomodoro/components/SessionList";
import { SettingsModal } from "@/features/pomodoro/components/SettingsModal";
import { TimerDisplay } from "@/features/pomodoro/components/TimerDisplay";
import {
  usePomodoroMutations,
  usePomodoroSessionsQuery,
  usePomodoroSettingsQuery,
} from "@/features/pomodoro/hooks/usePomodoro";
import { playCompletionSound } from "@/features/pomodoro/lib/sound";
import { usePomodoro } from "@/context/PomodoroProvider";

const fallbackSettings: PomodoroSettings = {
  workSec: 1500,
  shortBreakSec: 300,
  longBreakSec: 900,
  cyclesPerLong: 4,
  autoCycle: false,
  soundEnabled: true,
};

const FOCUS_PROJECT_KEY = "nisky:focus-project";

function secondsForPhase(phase: PomodoroPhase, settings: PomodoroSettings) {
  if (phase === "SHORT_BREAK") return settings.shortBreakSec;
  if (phase === "LONG_BREAK") return settings.longBreakSec;
  return settings.workSec;
}

function FocusPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const taskIdFromUrl = searchParams.get("taskId");
  const projectIdFromUrl = searchParams.get("projectId");
  const settingsQuery = usePomodoroSettingsQuery();
  const sessionsQuery = usePomodoroSessionsQuery({ limit: 8 });
  const projectsQuery = useProjectsQuery();
  const activeBlockQuery = useActiveBlockQuery();
  const [selectedProjectId, setSelectedProjectId] = useState(
    projectIdFromUrl ?? "",
  );
  const [showAllTasks, setShowAllTasks] = useState(false);
  const tasksQuery = useTasksQuery(
    showAllTasks
      ? { status: "PENDING", limit: 100 }
      : { projectId: selectedProjectId || undefined, status: "PENDING", limit: 100 },
  );
  const selectedTaskQuery = useTaskQuery(taskIdFromUrl);
  const mutations = usePomodoroMutations();
  const taskMutations = useTaskMutations();
  const globalPomodoro = usePomodoro();
  const settings = settingsQuery.data ?? fallbackSettings;
  const projects = projectsQuery.data ?? [];
  const [phase, setPhase] = useState<PomodoroPhase>("WORK");
  const [cycleIndex, setCycleIndex] = useState(1);
  const [selectedTaskId, setSelectedTaskId] = useState(taskIdFromUrl ?? "");
  const [session, setSession] = useState<PomodoroSession | null | undefined>(
    undefined,
  );
  const [now, setNow] = useState(() => Date.now());
  const [settingsOpen, setSettingsOpen] = useState(false);
  const completionInFlight = useRef(false);
  const lastCompletedIdRef = useRef<string | null>(null);
  const initializedRef = useRef(false);
  const tasks = (tasksQuery.data?.data ?? []).filter(
    (task) => task.status !== "COMPLETED" && task.status !== "CANCELLED",
  );

  useEffect(() => {
    if (initializedRef.current) return;
    const candidates = [
      projectIdFromUrl ?? undefined,
      activeBlockQuery.data?.projectId ?? undefined,
      typeof window !== "undefined"
        ? (localStorage.getItem(FOCUS_PROJECT_KEY) ?? undefined)
        : undefined,
      (projectsQuery.data ?? []).find((project) => project.isDefault)?.id,
    ].filter(Boolean) as string[];
    const initial = candidates[0];
    if (initial) {
      initializedRef.current = true;
      // eslint-disable-next-line react-hooks/set-state-in-effect -- fijar el proyecto inicial solo en la primera carga (comportamiento deliberado)
      setSelectedProjectId(initial);
    }
  }, [projectIdFromUrl, activeBlockQuery.data?.projectId, projectsQuery.data, selectedProjectId]);

  useEffect(() => {
    if (!selectedProjectId) return;
    localStorage.setItem(FOCUS_PROJECT_KEY, selectedProjectId);
  }, [selectedProjectId]);

  useEffect(() => {
    if (selectedTaskId) return;
    if (!lastCompletedIdRef.current) return;
    const list = tasksQuery.data?.data ?? [];
    const pending = list.filter(
      (task) => task.id !== lastCompletedIdRef.current,
    );
    if (pending.length === 0) return;
    const next = pending[0];
    setSelectedTaskId(next.id);
    const params = new URLSearchParams();
    if (selectedProjectId) params.set("projectId", selectedProjectId);
    params.set("taskId", next.id);
    router.replace(`/focus?${params.toString()}`);
  }, [tasksQuery.data, selectedProjectId, router, selectedTaskId]);
  const selectedTask =
    tasks.find((task) => task.id === selectedTaskId) ??
    (taskIdFromUrl ? selectedTaskQuery.data : null) ??
    null;
  const currentSession =
    session === undefined
      ? (globalPomodoro.activeSession ?? sessionsQuery.data?.data.find(
          (item) => item.status === "ACTIVE" || item.status === "PAUSED",
        ) ?? null)
      : session;
  const displayPhase = currentSession?.phase ?? phase;
  const remainingSec = currentSession
    ? Math.max(
        0,
        currentSession.plannedSec -
          Math.floor(
            (now - new Date(currentSession.startedAt).getTime()) / 1000,
          ) +
          currentSession.totalPausedSec +
          (currentSession.pausedAt
            ? Math.floor(
                (now - new Date(currentSession.pausedAt).getTime()) / 1000,
              )
            : 0),
      )
    : secondsForPhase(phase, settings);
  const running = Boolean(currentSession);
  const paused = currentSession?.status === "PAUSED";

  useEffect(() => {
    if (!currentSession || currentSession.status !== "ACTIVE") return undefined;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [currentSession]);

  const startPhase = useCallback(
    async (nextPhase: PomodoroPhase, nextCycleIndex: number) => {
      try {
        const started = await mutations.start.mutateAsync({
          phase: nextPhase,
          taskId: nextPhase === "WORK" ? selectedTaskId || null : null,
          cycleIndex: nextCycleIndex,
        });
        setPhase(nextPhase);
        setCycleIndex(nextCycleIndex);
        setSession(started);
        globalPomodoro.setActiveSession(started);
        setNow(Date.now());
      } catch {
        toast.error("Ups, no pudimos iniciar el Pomodoro.");
      }
    },
    [globalPomodoro, mutations.start, selectedTaskId],
  );

  const completeSession = useCallback(async () => {
    if (!currentSession || completionInFlight.current) return;
    completionInFlight.current = true;
    try {
      await mutations.action.mutateAsync({
        id: currentSession.id,
        action: "COMPLETE",
      });
      playCompletionSound(settings.soundEnabled);
      toast.success(
        currentSession.phase === "WORK"
          ? "¡Buen trabajo! Pomodoro completado"
          : "Descanso terminado. ¿Listo para el siguiente?",
      );
      const nextPhase =
        currentSession.phase === "WORK"
          ? currentSession.cycleIndex >= settings.cyclesPerLong
            ? "LONG_BREAK"
            : "SHORT_BREAK"
          : "WORK";
      const nextCycle =
        currentSession.phase === "SHORT_BREAK"
          ? currentSession.cycleIndex + 1
          : currentSession.phase === "LONG_BREAK"
            ? 1
            : currentSession.cycleIndex;
      setPhase(nextPhase);
      setCycleIndex(nextCycle);
      setSession(null);
      globalPomodoro.clearActiveSession();
      if (settings.autoCycle) await startPhase(nextPhase, nextCycle);
    } catch {
      toast.error("Ups, no pudimos guardar el Pomodoro completado. Inténtalo de nuevo.");
    } finally {
      completionInFlight.current = false;
    }
  }, [currentSession, globalPomodoro, mutations.action, settings, startPhase]);

  useEffect(() => {
    if (currentSession?.status !== "ACTIVE" || remainingSec > 0)
      return undefined;
    const completion = window.setTimeout(() => void completeSession(), 0);
    return () => window.clearTimeout(completion);
  }, [completeSession, currentSession, remainingSec]);

  const pauseResume = async () => {
    if (!currentSession) return;
    try {
      const updated = await mutations.action.mutateAsync({
        id: currentSession.id,
        action: paused ? "RESUME" : "PAUSE",
      });
      setSession(updated);
      globalPomodoro.setActiveSession(updated);
      setNow(Date.now());
    } catch {
      toast.error("Ups, algo falló al pausar o reanudar. Inténtalo de nuevo.");
    }
  };

  const stop = async () => {
    if (!currentSession) return;
    try {
      await mutations.action.mutateAsync({
        id: currentSession.id,
        action: "CANCEL",
      });
      setSession(null);
      globalPomodoro.clearActiveSession();
      toast.success("¡Listo, detuvimos el Pomodoro!");
    } catch {
      toast.error("Ups, no pudimos detener el Pomodoro.");
    }
  };

  const handleProjectChange = (projectId: string) => {
    setSelectedProjectId(projectId);
    setSelectedTaskId("");
    setShowAllTasks(false);
    const params = new URLSearchParams();
    if (projectId) params.set("projectId", projectId);
    router.replace(params.toString() ? `/focus?${params.toString()}` : "/focus");
  };

  const handleToggleShowAll = () => {
    setShowAllTasks((value) => !value);
    setSelectedTaskId("");
  };

  const completeTask = async () => {
    if (!selectedTask) return;
    const completedId = selectedTask.id;
    try {
      await taskMutations.update.mutateAsync({
        id: completedId,
        payload: { status: "COMPLETED" },
      });
      lastCompletedIdRef.current = completedId;
      toast.success("¡Tarea completada!");
      setSelectedTaskId("");
      if (taskIdFromUrl) {
        const params = new URLSearchParams();
        if (selectedProjectId) params.set("projectId", selectedProjectId);
        router.replace(params.toString() ? `/focus?${params.toString()}` : "/focus");
      }
    } catch {
      toast.error("Ups, no pudimos completar la tarea. Inténtalo de nuevo.");
    }
  };

  return (
    <main className="relative flex min-h-screen w-full flex-col items-center overflow-y-auto bg-surface px-4 py-6 sm:px-8 sm:py-10">
      <button
        className="absolute left-4 top-4 flex items-center gap-2 border border-outline-variant bg-surface-container-lowest px-3 py-2 font-body-sm text-body-sm text-on-surface-variant hover:border-outline hover:text-primary sm:left-6 sm:top-6"
        onClick={() => router.push("/")}
        type="button"
      >
        <ArrowLeft size={16} /> Salir del modo
      </button>
      <button
        aria-label="Configuración Pomodoro"
        className="absolute right-4 top-4 border border-outline-variant bg-surface-container-lowest p-2 text-on-surface-variant hover:border-outline hover:text-primary sm:right-6 sm:top-6"
        onClick={() => setSettingsOpen(true)}
        type="button"
      >
        <Settings size={17} />
      </button>
      <div className="flex w-full max-w-2xl flex-col items-center gap-8 pt-16 sm:gap-12 sm:pt-10">
        <div className="flex w-full flex-col gap-3 border border-outline-variant bg-surface-container-lowest p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-label-caps text-label-caps uppercase text-on-surface-variant">
              ENFOQUE
            </span>
            {activeBlockQuery.data?.projectId &&
              activeBlockQuery.data.projectId === selectedProjectId &&
              !showAllTasks && (
                <span className="border border-outline-variant bg-surface-container-low px-2 py-0.5 font-label-caps text-[10px] uppercase text-primary">
                  Bloque activo
                </span>
              )}
          </div>
          <label className="block">
            <span className="font-label-caps text-label-caps text-on-surface-variant">PROYECTO</span>
            <select
              aria-label="Seleccionar proyecto"
              className="field mt-1 w-full"
              disabled={running}
              onChange={(event) => handleProjectChange(event.target.value)}
              value={selectedProjectId}
            >
              {projects.length === 0 && <option value="">Sin proyectos</option>}
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="font-label-caps text-label-caps text-on-surface-variant">TAREA</span>
            <select
              aria-label="Seleccionar tarea"
              className="field mt-1 w-full"
              disabled={running}
              onChange={(event) => setSelectedTaskId(event.target.value)}
              value={selectedTaskId}
            >
              <option value="">
                {tasks.length === 0 ? "No hay tareas en este proyecto" : "Elige una tarea para empezar"}
              </option>
              {tasks.map((task) => (
                <option key={task.id} value={task.id}>
                  {task.title}
                </option>
              ))}
            </select>
          </label>
          <button
            aria-pressed={showAllTasks}
            className={`flex items-center gap-2 self-start border px-3 py-1.5 font-body-sm text-body-sm ${showAllTasks ? "border-primary bg-primary-container text-on-primary" : "border-outline-variant text-on-surface-variant hover:bg-surface-container-low hover:text-primary"}`}
            disabled={running}
            onClick={handleToggleShowAll}
            type="button"
          >
            {showAllTasks ? "Mostrando todas las tareas" : "Ver todas las tareas"}
          </button>
        </div>
        {selectedTask && (
          <TaskFocusDetails
            disabled={running}
            key={selectedTask.id}
            onComplete={completeTask}
            task={selectedTask}
          />
        )}
        <TimerDisplay
          phase={displayPhase}
          pomodorosCompleted={selectedTask?.pomodoroCount ?? null}
          pomodorosEstimated={selectedTask?.pomodoroEstimate ?? null}
          remainingSec={remainingSec}
        />
        <Controls
          onCompletePomodoro={() => void completeSession()}
          onPause={() => void pauseResume()}
          onResume={() => void pauseResume()}
          onStart={() => void startPhase(phase, cycleIndex)}
          onStop={() => void stop()}
          paused={Boolean(paused)}
          phase={displayPhase}
          running={running}
        />
        <div className="flex w-full max-w-2xl flex-col gap-4">
          <div className="flex items-center justify-center gap-2 font-body-sm text-body-sm text-on-surface-variant">
            <Timer size={15} />{" "}
            {settings.autoCycle ? "Pasar al descanso automáticamente" : "Tú decides cuándo descansar"}
          </div>
          <SessionList sessions={sessionsQuery.data?.data ?? []} />
        </div>
      </div>
      {settingsOpen && (
        <SettingsModal
          onClose={() => setSettingsOpen(false)}
          settings={settings}
        />
      )}
    </main>
  );
}

export default function FocusPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-surface font-body-sm text-body-sm text-on-surface-variant">
          Cargando modo enfoque...
        </div>
      }
    >
      <FocusPageContent />
    </Suspense>
  );
}
