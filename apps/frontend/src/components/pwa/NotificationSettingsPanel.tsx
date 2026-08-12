"use client";

import { useState, useEffect } from "react";
import { Activity, CalendarClock, X as XIcon } from "lucide-react";
import { toast } from "sonner";
import { useNotificationLogsQuery, useNotificationSettingsMutation, useNotificationSettingsQuery } from "@/features/notifications/hooks/useNotifications";
import type { NotificationLog, NotificationSettingsPayload } from "@/features/notifications/api/notifications";
import { PushSubscriptionManager } from "@/components/pwa/PushSubscriptionManager";
import { cn } from "@/lib/utils";

type FlagKey = "morningDigest" | "taskDueReminders" | "integrationNews" | "integrationErrors" | "timeBlockReminders" | "habitReminders";

const OPTIONS: Array<{ key: FlagKey; title: string; description: string }> = [
  { key: "morningDigest", title: "Resumen de la mañana", description: "Un aviso a las 7:00 con lo que vence hoy, lo vencido ayer y tu primer bloque." },
  { key: "taskDueReminders", title: "Tareas por vencer", description: "Aviso puntual cuando una tarea vence hoy o mañana." },
  { key: "timeBlockReminders", title: "Horario", description: "Aviso al iniciar tu bloque, cuando queden 5 minutos y, si configuras aviso previo en el bloque, antes de empezar." },
  { key: "habitReminders", title: "Hábitos", description: "Te recordamos tus hábitos pendientes y celebramos tus rachas." },
  { key: "integrationNews", title: "Nuevas asignaciones de la universidad", description: "Te avisamos cuando la plataforma de tu universidad sincroniza tareas nuevas." },
  { key: "integrationErrors", title: "Errores de sincronización", description: "Te avisamos si una cuenta de la universidad no logra sincronizar." },
];

function Toggle({ checked, onChange, disabled }: { checked: boolean; onChange: (value: boolean) => void; disabled?: boolean }) {
  return (
    <button
      aria-checked={checked}
      aria-label={checked ? "Activo, pulsar para desactivar" : "Inactivo, pulsar para activar"}
      className={cn(
        "relative h-6 w-11 shrink-0 rounded-full border transition-colors",
        checked ? "border-primary bg-primary" : "border-outline-variant bg-surface-container-high",
        disabled && "opacity-40",
      )}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      role="switch"
      type="button"
    >
      <span
        className={cn(
          "absolute top-1/2 h-4 w-4 -translate-y-1/2 rounded-full transition-all",
          checked ? "left-[calc(100%-1.25rem)] bg-on-primary" : "left-1 bg-on-surface-variant",
        )}
      />
    </button>
  );
}

const STATUS_STYLES: Record<NotificationLog["status"], string> = {
  sent: "bg-primary text-on-primary",
  partial: "bg-tertiary-container text-tertiary",
  failed: "bg-error-container text-error",
  skipped: "bg-surface-container-high text-on-surface-variant",
};

const STATUS_LABELS: Record<NotificationLog["status"], string> = {
  sent: "Enviado",
  partial: "Parcial",
  failed: "Fallido",
  skipped: "Omitido",
};

const VISIBLE_LOGS = 6;
const HIDE_AUDIT_KEY = "nisky:hide-notif-audit";

function NotificationLogsPanel() {
  const logsQuery = useNotificationLogsQuery();
  const logs = logsQuery.data ?? [];
  const [expanded, setExpanded] = useState(false);
  const [hidden, setHidden] = useState(false);

  const visibleLogs = expanded ? logs : logs.slice(0, VISIBLE_LOGS);
  const hasMore = logs.length > VISIBLE_LOGS;

  useEffect(() => {
    try {
      if (window.localStorage.getItem(HIDE_AUDIT_KEY) === "1") setHidden(true);
    } catch {
      // privacidad: si el storage no está disponible, seguimos mostrando
    }
  }, []);

  const hideForGood = () => {
    try {
      window.localStorage.setItem(HIDE_AUDIT_KEY, "1");
    } catch {
      // idem
    }
    setHidden(true);
  };

  if (hidden) return null;

  return (
    <section className="max-w-2xl border border-outline-variant bg-surface-container-lowest p-container-padding">
      <div className="flex items-start gap-3">
        <Activity className="mt-0.5 text-primary" size={20} />
        <div className="min-w-0 flex-1">
          <h2 className="font-headline-xs text-headline-xs">Últimas notificaciones</h2>
          <p className="mt-1 font-body-sm text-body-sm text-on-surface-variant">
            Lo que Nisky ha intentado enviar últimamente, para confirmar que todo llega bien. Es solo para la etapa de pruebas.
          </p>
        </div>
        <button aria-label="Quitar este registro" className="shrink-0 text-on-surface-variant hover:text-primary" onClick={hideForGood} type="button">
          <XIcon size={16} />
        </button>
      </div>
      {logsQuery.isLoading ? (
        <p className="mt-4 font-body-sm text-body-sm text-on-surface-variant">Cargando registro...</p>
      ) : visibleLogs.length === 0 ? (
        <p className="mt-4 font-body-sm text-body-sm text-on-surface-variant">
          Aún no hay nada por aquí. Pulsa «Enviar prueba» arriba o espera a que llegue un recordatorio real.
        </p>
      ) : (
        <ul className="mt-4 divide-y divide-outline-variant border-t border-outline-variant">
          {visibleLogs.map((log) => (
            <li className="flex items-start justify-between gap-3 py-3" key={log.id}>
              <div className="min-w-0">
                <p className="truncate font-body-md text-body-md text-on-surface">{log.title}</p>
                <p className="mt-0.5 font-data-mono text-data-mono text-xs text-on-surface-variant">
                  {new Date(log.createdAt).toLocaleString("es-CO", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })} · {log.event} · {log.sentCount}/{log.totalCount}
                </p>
                {log.error && <p className="mt-0.5 truncate font-body-sm text-body-sm text-error">{log.error}</p>}
              </div>
              <span className={cn("mt-0.5 shrink-0 px-2 py-0.5 font-data-mono text-data-mono text-xs", STATUS_STYLES[log.status])}>
                {STATUS_LABELS[log.status]}
              </span>
            </li>
          ))}
        </ul>
      )}
      {hasMore && (
        <button
          className="mt-3 border border-outline-variant px-3 py-1.5 font-body-sm text-body-sm text-primary hover:bg-surface-container-high"
          onClick={() => setExpanded((value) => !value)}
          type="button"
        >
          {expanded ? "Ver menos" : `Ver más (${logs.length - VISIBLE_LOGS} más)`}
        </button>
      )}
    </section>
  );
}

export function NotificationSettingsPanel() {
  const settingsQuery = useNotificationSettingsQuery();
  const mutation = useNotificationSettingsMutation();
  const settings = settingsQuery.data;
  const isSubscribed = settingsQuery.isSuccess;

  const save = async (payload: NotificationSettingsPayload) => {
    try {
      await mutation.mutateAsync(payload);
      toast.success("Preferencias de notificación actualizadas");
    } catch {
      toast.error("Ups, no pudimos actualizar las preferencias.");
    }
  };

  return (
    <div className="space-y-6">
      <PushSubscriptionManager />
      <NotificationLogsPanel />
      {settingsQuery.isLoading ? (
        <p className="font-body-sm text-body-sm text-on-surface-variant">Cargando preferencias...</p>
      ) : settingsQuery.isError ? (
        <p className="font-body-sm text-body-sm text-error">Ups, no pudimos cargar las preferencias.</p>
      ) : (
        <section className="max-w-2xl border border-outline-variant bg-surface-container-lowest p-container-padding">
          <div className="flex items-start gap-3">
            <CalendarClock className="mt-0.5 text-primary" size={20} />
            <div>
              <h2 className="font-headline-xs text-headline-xs">Qué notificaciones recibes</h2>
              <p className="mt-1 font-body-sm text-body-sm text-on-surface-variant">Elige qué avisos push quieres recibir en este dispositivo.</p>
              {!isSubscribed && (
                <p className="mt-2 font-body-sm text-body-sm text-error">Activa las notificaciones arriba para recibir estos avisos.</p>
              )}
            </div>
          </div>
          <div className="mt-4 divide-y divide-outline-variant border-t border-outline-variant">
            {OPTIONS.map((option) => (
              <div className="flex items-center justify-between gap-4 py-3" key={option.key}>
                <div className="min-w-0">
                  <p className="font-body-md text-body-md text-on-surface">{option.title}</p>
                  <p className="mt-0.5 font-body-sm text-body-sm text-on-surface-variant">{option.description}</p>
                </div>
                <Toggle
                  checked={Boolean(settings?.[option.key])}
                  disabled={mutation.isPending}
                  onChange={(value) => void save({ [option.key]: value })}
                />
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
