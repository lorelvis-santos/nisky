"use client";

import { useEffect } from "react";
import { PomodoroPictureInPicture } from "@/features/pomodoro/components/PomodoroPictureInPicture";
import { usePomodoro } from "@/context/PomodoroProvider";
import { useAuth } from "@/context/AuthProvider";

function closeWindow() {
  window.close();
}

function openFocus(taskId: string | null) {
  const query = taskId ? `?taskId=${encodeURIComponent(taskId)}` : "";
  const url = `/focus${query}`;
  if (window.opener && !window.opener.closed) {
    window.opener.location.assign(url);
    window.opener.focus();
    return;
  }
  window.open(url, "_blank", "noopener,noreferrer");
}

function WindowShell({ children }: { children: React.ReactNode }) {
  return <main className="flex min-h-screen items-center justify-center bg-surface p-3 text-on-surface">{children}</main>;
}

export default function PomodoroWindowPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const pomodoro = usePomodoro();
  const session = pomodoro.activeSession;
  const remainingSec = pomodoro.remainingSec;

  useEffect(() => {
    document.title = "Pomodoro · Nisky";
  }, []);

  if (isLoading) {
    return <WindowShell><p className="p-3 text-center font-body-sm text-body-sm text-on-surface-variant">Cargando Pomodoro...</p></WindowShell>;
  }

  if (!isAuthenticated) {
    return <WindowShell><p className="p-3 text-center font-body-sm text-body-sm text-on-surface-variant">La sesión de Nisky ya no está disponible.</p></WindowShell>;
  }

  if (!session || remainingSec === null) {
    return <PomodoroPictureInPicture session={null} remainingSec={null} onCancel={pomodoro.cancel} onClose={closeWindow} onOpenFocus={openFocus} onPauseResume={pomodoro.pauseResume} />;
  }

  return (
    <PomodoroPictureInPicture
      onCancel={pomodoro.cancel}
      onClose={closeWindow}
      onOpenFocus={openFocus}
      onPauseResume={pomodoro.pauseResume}
      remainingSec={remainingSec}
      session={session}
    />
  );
}
