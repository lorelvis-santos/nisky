"use client";

import { Activity, CalendarClock, CheckIcon, XIcon } from "lucide-react";
import { toast } from "sonner";
import { useNotificationLogsQuery, useNotificationSettingsMutation, useNotificationSettingsQuery } from "@/features/notifications/hooks/useNotifications";
import type { NotificationLog, NotificationSettingsPayload } from "@/features/notifications/api/notifications";
import { PushSubscriptionManager } from "@/components/pwa/PushSubscriptionManager";
import { cn } from "@/lib/utils";

type FlagKey = "morningDigest" | "taskDueReminders" | "integrationNews" | "integrationErrors" | "timeBlockReminders";

const OPTIONS: Array<{ key: FlagKey; title: string; description: string }> = [
  { key: "morningDigest", title: "Resumen de la mañana", description: "Un aviso a las 7:00 con lo que vence hoy, lo vencido ayer y tu primer bloque." },
  { key: "taskDueReminders", title: "Tareas por vencer", description: "Aviso puntual cuando una tarea vence hoy o mañana." },
  { key: "integrationNews", title: "Nuevas asignaciones de la universidad", description: "Te avisamos cuando la plataforma de tu universidad sincroniza tareas nuevas." },
  { key: "integrationErrors", title: "Errores de sincronización", description: "Te avisamos si una cuenta de la universidad no logra sincronizar." },
  { key: "timeBlockReminders", title: "Agenda", description: "Avisos antes de empezar, al iniciar y al quedar 5 minutos." },
];

function Toggle({ checked, onChange, disabled }: { checked: boolean; onChange: (value: boolean) => void; disabled?: boolean }) {
  return (
    <button
      aria-checked={checked}
      aria-label={checked ? "Activo, pulsar para desactivar" : "Inactivo, pulsar para activar"}
      className={cn("flex h-6 w-11 items-center rounded-full border px-0.5 transition-colors", checked ? "justify-end border-primary bg-primary" : "justify-start border-outline-variant bg-surface-container-high", disabled && "opacity-40")}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      role="switch"
      type="button"
    >
      <span className={cn("flex h-5 w-5 items-center justify-center", checked ? "bg-on-primary text-primary" : "bg-on-surface-variant text-surface-container-high")}>
        {checked ? <CheckIcon size={12} strokeWidth={3} /> : <XIcon size={12} strokeWidth={3} />}
      </span>
    </button>
  );
}

const STATUS_STYLES: Record<NotificationLog["status"], string> = {
  sent: "bg-primary-container text-primary",
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

function NotificationLogsPanel() {
  const logsQuery = useNotificationLogsQuery();
  const logs = logsQuery.data ?? [];
  return (
    <section className="max-w-2xl border border-outline-variant bg-surface-container-lowest p-container-padding">
      <div className="flex items-start gap-3">
        <Activity className="mt-0.5 text-primary" size={20} />
        <div>
          <h2 className="font-headline-xs text-headline-xs">Registro de notificaciones</h2>
          <p className="mt-1 font-body-sm text-body-sm text-on-surface-variant">
            Últimos envíos registrados (exito, fallo u omisión) para diagnosticar si están llegando.
          </p>
        </div>
      </div>
      {logsQuery.isLoading ? (
        <p className="mt-4 font-body-sm text-body-sm text-on-surface-variant">Cargando registro...</p>
      ) : logs.length === 0 ? (
        <p className="mt-4 font-body-sm text-body-sm text-on-surface-variant">
          Aún no hay envíos registrados. Pulsa «Enviar prueba» arriba o espera un recordatorio real.
        </p>
      ) : (
        <ul className="mt-4 divide-y divide-outline-variant border-t border-outline-variant">
          {logs.map((log) => (
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
