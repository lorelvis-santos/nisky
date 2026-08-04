"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "./AuthProvider";
import { actOnPomodoroSession, fetchPomodoroSessions } from "@/features/pomodoro/api/pomodoro";
import type { PomodoroSession } from "@/types/entities";

interface PomodoroContextValue {
  activeSession: PomodoroSession | null;
  now: number;
  remainingSec: number | null;
  setActiveSession: (session: PomodoroSession) => void;
  clearActiveSession: () => void;
  pauseResume: () => Promise<void>;
  cancel: () => Promise<void>;
}

const PomodoroContext = createContext<PomodoroContextValue | undefined>(undefined);

export function pomodoroRemaining(session: PomodoroSession, now = Date.now()) {
  const elapsed = Math.floor((now - new Date(session.startedAt).getTime()) / 1000);
  const paused = session.pausedAt ? Math.floor((now - new Date(session.pausedAt).getTime()) / 1000) : 0;
  return Math.max(0, session.plannedSec - elapsed + session.totalPausedSec + paused);
}

export function formatPomodoroTime(seconds: number) {
  return `${String(Math.floor(Math.max(0, seconds) / 60)).padStart(2, "0")}:${String(Math.max(0, seconds) % 60).padStart(2, "0")}`;
}

export function PomodoroProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const [activeSession, setActiveSession] = useState<PomodoroSession | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!isAuthenticated) {
      const clear = window.setTimeout(() => setActiveSession(null), 0);
      return () => window.clearTimeout(clear);
    }
    let mounted = true;
    void fetchPomodoroSessions({ limit: 100 }).then((result) => {
      if (!mounted) return;
      setActiveSession(result.data.find((session) => session.status === "ACTIVE" || session.status === "PAUSED") ?? null);
    }).catch(() => {
      if (mounted) setActiveSession(null);
    });
    return () => { mounted = false; };
  }, [isAuthenticated]);

  useEffect(() => {
    if (!activeSession || activeSession.status !== "ACTIVE") return undefined;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [activeSession]);

  const value = useMemo<PomodoroContextValue>(() => ({
    activeSession,
    now,
    remainingSec: activeSession ? pomodoroRemaining(activeSession, now) : null,
    setActiveSession: (session) => setActiveSession(session),
    clearActiveSession: () => setActiveSession(null),
    pauseResume: async () => {
      if (!activeSession) return;
      const action = activeSession.status === "PAUSED" ? "RESUME" : "PAUSE";
      const updated = await actOnPomodoroSession(activeSession.id, action);
      setActiveSession(updated);
      setNow(Date.now());
      await queryClient.invalidateQueries({ queryKey: ["pomodoro-sessions"] });
    },
    cancel: async () => {
      if (!activeSession) return;
      await actOnPomodoroSession(activeSession.id, "CANCEL");
      setActiveSession(null);
      await queryClient.invalidateQueries({ queryKey: ["pomodoro-sessions"] });
    },
  }), [activeSession, now, queryClient]);

  return <PomodoroContext.Provider value={value}>{children}</PomodoroContext.Provider>;
}

export function usePomodoro() {
  const context = useContext(PomodoroContext);
  if (!context) throw new Error("usePomodoro debe usarse dentro de PomodoroProvider");
  return context;
}
