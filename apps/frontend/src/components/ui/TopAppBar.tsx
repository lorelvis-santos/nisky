"use client";

import { Bell, History, Menu, Pause, Play, Square, UserCircle } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";
import { formatPomodoroTime, usePomodoro } from "@/context/PomodoroProvider";

const titles: Record<string, string> = {
  "/": "Mi día",
  "/tasks": "Planificación y tareas",
  "/focus": "Modo enfoque",
  "/journal": "Diario",
  "/knowledge": "Mis notas",
  "/settings": "Ajustes",
  "/support": "Ayuda",
};

export function TopAppBar({ onMenu }: { onMenu: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const pomodoro = usePomodoro();
  const title = titles[pathname] ?? "Nisky";

  const togglePause = async () => {
    try { await pomodoro.pauseResume(); } catch { toast.error("Ups, no pudimos actualizar el Pomodoro."); }
  };

  const cancel = async () => {
    try { await pomodoro.cancel(); toast.success("¡Listo, Pomodoro cancelado!"); } catch { toast.error("Ups, no pudimos cancelar el Pomodoro."); }
  };

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-outline-variant bg-surface px-container-padding">
      <div className="flex items-center gap-element-gap-sm">
        <div className="flex items-center gap-element-gap-md md:hidden">
          <button aria-label="Abrir menú" className="text-on-surface-variant hover:text-primary" onClick={onMenu} type="button"><Menu size={20} /></button>
          <span className="font-headline-sm text-headline-sm font-bold text-primary">Nisky</span>
        </div>
        {pomodoro.activeSession && pomodoro.remainingSec !== null && <div className="flex items-center gap-1 border border-outline-variant bg-surface-container-lowest px-2 py-1"><button aria-label={pomodoro.activeSession.status === "PAUSED" ? "Reanudar Pomodoro" : "Pausar Pomodoro"} className="text-primary hover:text-primary-container" onClick={() => void togglePause()} type="button">{pomodoro.activeSession.status === "PAUSED" ? <Play size={14} /> : <Pause size={14} />}</button><button aria-label="Abrir Pomodoro" className="font-data-mono text-data-mono text-xs text-primary hover:underline" onClick={() => router.push(`/focus${pomodoro.activeSession?.taskId ? `?taskId=${encodeURIComponent(pomodoro.activeSession.taskId)}` : ""}`)} type="button">{formatPomodoroTime(pomodoro.remainingSec)}</button><button aria-label="Cancelar Pomodoro" className="text-on-surface-variant hover:text-error" onClick={() => void cancel()} type="button"><Square size={13} /></button></div>}
      </div>
      <div className="hidden flex-1 md:block" />
      <h2 className="absolute left-1/2 hidden -translate-x-1/2 font-headline-sm text-headline-sm font-bold text-on-surface lg:block">{title}</h2>
      <div className="ml-auto flex items-center gap-element-gap-sm">
        <button aria-label="Notificaciones" className="p-2 text-on-surface-variant hover:bg-surface-container-low hover:text-primary" type="button"><Bell size={19} /></button>
        <button aria-label="Historial" className="hidden p-2 text-on-surface-variant hover:bg-surface-container-low hover:text-primary sm:block" type="button"><History size={19} /></button>
        <button aria-label="Perfil" className="p-2 text-on-surface-variant hover:bg-surface-container-low hover:text-primary" type="button"><UserCircle size={20} /></button>
      </div>
    </header>
  );
}
