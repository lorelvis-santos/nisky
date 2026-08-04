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
import { useTaskQuery, useTasksQuery } from "@/features/tasks/hooks/useTasks";
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

function secondsForPhase(phase: PomodoroPhase, settings: PomodoroSettings) {
  if (phase === "SHORT_BREAK") return settings.shortBreakSec;
  if (phase === "LONG_BREAK") return settings.longBreakSec;
  return settings.workSec;
}

function FocusPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const taskIdFromUrl = searchParams.get("taskId");
  const settingsQuery = usePomodoroSettingsQuery();
  const sessionsQuery = usePomodoroSessionsQuery({ limit: 8 });
  const tasksQuery = useTasksQuery({ limit: 100 });
  const selectedTaskQuery = useTaskQuery(taskIdFromUrl);
  const mutations = usePomodoroMutations();
  const globalPomodoro = usePomodoro();
  const settings = settingsQuery.data ?? fallbackSettings;
  const [phase, setPhase] = useState<PomodoroPhase>("WORK");
  const [cycleIndex, setCycleIndex] = useState(1);
  const [selectedTaskId, setSelectedTaskId] = useState(taskIdFromUrl ?? "");
  const [session, setSession] = useState<PomodoroSession | null | undefined>(
    undefined,
  );
  const [now, setNow] = useState(() => Date.now());
  const [settingsOpen, setSettingsOpen] = useState(false);
  const completionInFlight = useRef(false);
  const tasks = (tasksQuery.data?.data ?? []).filter(
    (task) => task.status !== "COMPLETED" && task.status !== "CANCELLED",
  );
  const selectedTask =
    tasks.find((task) => task.id === selectedTaskId) ??
    selectedTaskQuery.data ??
    null;
  const currentSession =
    session === undefined
      ? (globalPomodoro.activeSession ?? sessionsQuery.data?.data.find(
          (item) => item.status === "ACTIVE" || item.status === "PAUSED",
        ) ?? null)
      : session;
  const displayPhase = currentSession?.phase ?? phase;
  const displayCycleIndex = currentSession?.cycleIndex ?? cycleIndex;
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
        toast.error("No se pudo iniciar la sesión Pomodoro");
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
          ? "Pomodoro completado"
          : "Descanso terminado",
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
      setSession(null);
      globalPomodoro.clearActiveSession();
      if (settings.autoCycle) await startPhase(nextPhase, nextCycle);
    } catch {
      toast.error("No se pudo completar la sesión");
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
      toast.error("No se pudo actualizar la sesión");
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
      toast.success("Sesión detenida");
    } catch {
      toast.error("No se pudo detener la sesión");
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
        <div className="flex w-full flex-col items-center border border-outline-variant bg-surface-container-lowest p-5 text-center sm:p-6">
          <span className="font-label-caps text-label-caps uppercase tracking-widest text-on-surface-variant">
            ENFOQUE ACTUAL
          </span>
          <select
            aria-label="Tarea vinculada"
            className="field mt-3 max-w-xl text-center"
            disabled={running}
            onChange={(event) => setSelectedTaskId(event.target.value)}
            value={selectedTaskId}
          >
            <option value="">Sin tarea vinculada</option>
            {tasks.map((task) => (
              <option key={task.id} value={task.id}>
                {task.title} · Pomodoros {task.pomodoroCount}/
                {task.pomodoroEstimate} · Subtareas{" "}
                {task.completedSubtasks ?? 0}/
                {task.subtaskCount ?? task.subtasks?.length ?? 0}
              </option>
            ))}
          </select>
          {selectedTaskId && (
            <p className="mt-2 font-body-sm text-body-sm text-on-surface-variant">
              La sesión de trabajo se asociará a esta tarea.
            </p>
          )}
        </div>
        {selectedTask && (
          <TaskFocusDetails
            disabled={running}
            key={selectedTask.id}
            task={selectedTask}
          />
        )}
        <TimerDisplay
          cycleIndex={displayCycleIndex}
          cyclesPerLong={settings.cyclesPerLong}
          phase={displayPhase}
          remainingSec={remainingSec}
        />
        <Controls
          onComplete={() => void completeSession()}
          onPause={() => void pauseResume()}
          onResume={() => void pauseResume()}
          onStart={() => void startPhase(phase, cycleIndex)}
          onStop={() => void stop()}
          paused={Boolean(paused)}
          running={running}
        />
        <div className="flex w-full max-w-2xl flex-col gap-4">
          <div className="flex items-center justify-center gap-2 font-body-sm text-body-sm text-on-surface-variant">
            <Timer size={15} />{" "}
            {settings.autoCycle ? "Ciclos automáticos activos" : "Ciclo manual"}
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
