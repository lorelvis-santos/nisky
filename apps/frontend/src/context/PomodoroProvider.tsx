"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useAuth } from "./AuthProvider";
import { actOnPomodoroSession, fetchPomodoroSessions } from "@/features/pomodoro/api/pomodoro";
import { PomodoroPictureInPicture } from "@/features/pomodoro/components/PomodoroPictureInPicture";
import { getDocumentPictureInPicture } from "@/features/pomodoro/lib/window";
import { formatPomodoroTime as formatTime } from "@/features/pomodoro/lib/time";
import type { PomodoroSession } from "@/types/entities";

interface PomodoroContextValue {
  activeSession: PomodoroSession | null;
  now: number;
  remainingSec: number | null;
  setActiveSession: (session: PomodoroSession) => void;
  clearActiveSession: () => void;
  pauseResume: () => Promise<void>;
  cancel: () => Promise<void>;
  openPictureInPicture: () => Promise<boolean>;
  closePictureInPicture: () => void;
}

const PomodoroContext = createContext<PomodoroContextValue | undefined>(undefined);
const POMODORO_CHANNEL = "nisky:pomodoro";

type PomodoroMessage =
  | { type: "ACTIVE_SESSION"; session: PomodoroSession }
  | { type: "CLEAR_SESSION" };

function copyDocumentStyles(source: Document, target: Document) {
  source.querySelectorAll('link[rel="stylesheet"], style').forEach((style) => {
    target.head.appendChild(style.cloneNode(true));
  });
}

export function pomodoroRemaining(session: PomodoroSession, now = Date.now()) {
  const elapsed = Math.floor((now - new Date(session.startedAt).getTime()) / 1000);
  const paused = session.pausedAt ? Math.floor((now - new Date(session.pausedAt).getTime()) / 1000) : 0;
  return Math.max(0, session.plannedSec - elapsed + session.totalPausedSec + paused);
}

export function formatPomodoroTime(seconds: number) {
  return formatTime(seconds);
}

export function PomodoroProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const [activeSession, setActiveSession] = useState<PomodoroSession | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const channelRef = useRef<BroadcastChannel | null>(null);
  const [pictureInPictureWindow, setPictureInPictureWindow] = useState<Window | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || typeof BroadcastChannel === "undefined") return undefined;
    const channel = new BroadcastChannel(POMODORO_CHANNEL);
    channelRef.current = channel;
    channel.onmessage = (event: MessageEvent<PomodoroMessage>) => {
      if (event.data?.type === "ACTIVE_SESSION") setActiveSession(event.data.session);
      if (event.data?.type === "CLEAR_SESSION") setActiveSession(null);
    };
    return () => {
      channel.close();
      channelRef.current = null;
    };
  }, []);

  const broadcast = useCallback((message: PomodoroMessage) => {
    channelRef.current?.postMessage(message);
  }, []);

  const openPictureInPicture = useCallback(async () => {
    const pictureInPicture = getDocumentPictureInPicture();
    if (!pictureInPicture) return false;
    const existing = pictureInPicture.window;
    if (existing && !existing.closed) {
      setPictureInPictureWindow(existing);
      existing.focus();
      return true;
    }

    try {
      const nextWindow = await pictureInPicture.requestWindow({ width: 480, height: 300 });
      nextWindow.document.title = "Pomodoro · Nisky";
      nextWindow.document.body.style.margin = "0";
      nextWindow.document.body.style.width = "100%";
      nextWindow.document.body.style.minWidth = "0";
      nextWindow.document.body.style.overflow = "hidden";
      copyDocumentStyles(document, nextWindow.document);
      nextWindow.addEventListener("pagehide", () => {
        setPictureInPictureWindow((current) => current === nextWindow ? null : current);
      }, { once: true });
      setPictureInPictureWindow(nextWindow);
      return true;
    } catch {
      return false;
    }
  }, []);

  const closePictureInPicture = useCallback(() => {
    pictureInPictureWindow?.close();
    setPictureInPictureWindow(null);
  }, [pictureInPictureWindow]);

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
    setActiveSession: (session) => {
      setActiveSession(session);
      broadcast({ type: "ACTIVE_SESSION", session });
    },
    clearActiveSession: () => {
      setActiveSession(null);
      broadcast({ type: "CLEAR_SESSION" });
    },
    pauseResume: async () => {
      if (!activeSession) return;
      const action = activeSession.status === "PAUSED" ? "RESUME" : "PAUSE";
      const updated = await actOnPomodoroSession(activeSession.id, action);
      setActiveSession(updated);
      broadcast({ type: "ACTIVE_SESSION", session: updated });
      setNow(Date.now());
      await queryClient.invalidateQueries({ queryKey: ["pomodoro-sessions"] });
    },
    cancel: async () => {
      if (!activeSession) return;
      await actOnPomodoroSession(activeSession.id, "CANCEL");
      setActiveSession(null);
      broadcast({ type: "CLEAR_SESSION" });
      await queryClient.invalidateQueries({ queryKey: ["pomodoro-sessions"] });
    },
    openPictureInPicture,
    closePictureInPicture,
  }), [activeSession, broadcast, closePictureInPicture, now, openPictureInPicture, queryClient]);

  return (
    <PomodoroContext.Provider value={value}>
      {children}
      {pictureInPictureWindow && !pictureInPictureWindow.closed && createPortal(
        <PomodoroPictureInPicture
          onCancel={value.cancel}
          onClose={value.closePictureInPicture}
          onOpenFocus={(taskId) => {
            const query = taskId ? `?taskId=${encodeURIComponent(taskId)}` : "";
            router.push(`/focus${query}`);
          }}
          onPauseResume={value.pauseResume}
          remainingSec={value.remainingSec}
          session={value.activeSession}
        />,
        pictureInPictureWindow.document.body,
      )}
    </PomodoroContext.Provider>
  );
}

export function usePomodoro() {
  const context = useContext(PomodoroContext);
  if (!context) throw new Error("usePomodoro debe usarse dentro de PomodoroProvider");
  return context;
}
