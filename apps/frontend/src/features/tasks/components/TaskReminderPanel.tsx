"use client";

import { Bell, Plus, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import type { ReminderRepeatType } from "@/types/entities";
import { useReminderMutations, useRemindersQuery } from "@/features/reminders/hooks/useReminders";

const REMINDER_LEADS: { label: string; minutes: number }[] = [
  { label: "Hora exacta", minutes: 0 },
  { label: "5 min antes", minutes: 5 },
  { label: "10 min antes", minutes: 10 },
  { label: "20 min antes", minutes: 20 },
  { label: "30 min antes", minutes: 30 },
  { label: "1 hora antes", minutes: 60 },
  { label: "1 día antes", minutes: 1440 },
];

export type TaskReminderRecurrence = {
  repeatType?: ReminderRepeatType | null;
  repeatInterval?: number;
  repeatDaysOfWeek?: number[];
};

function formatReminderTrigger(value: string) {
  return new Intl.DateTimeFormat("es-CO", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

function repeatLabel(type: ReminderRepeatType, interval: number) {
  if (type === "DAILY") return interval === 1 ? "Cada día" : `Cada ${interval} días`;
  if (type === "WEEKLY") return interval === 1 ? "Cada semana" : `Cada ${interval} semanas`;
  return interval === 1 ? "Cada mes" : `Cada ${interval} meses`;
}

export function TaskReminderPanel({ taskId, taskTitle, dueDate, recurrence }: {
  taskId: string;
  taskTitle: string;
  dueDate: string | null;
  recurrence?: TaskReminderRecurrence;
}) {
  const reminderQuery = useRemindersQuery();
  const reminderMutations = useReminderMutations();
  const [reminderLead, setReminderLead] = useState(1440);
  const [composerOpen, setComposerOpen] = useState(false);
  const taskReminders = (reminderQuery.data ?? []).filter((reminder) => reminder.payload?.taskId === taskId);
  const composerId = `task-reminder-composer-${taskId}`;
  const headingId = `task-reminders-heading-${taskId}`;

  const createReminder = async () => {
    if (!dueDate) {
      toast.error("La tarea necesita fecha límite para recordarla.");
      return;
    }
    const due = new Date(dueDate);
    if (Number.isNaN(due.getTime())) {
      toast.error("La fecha límite no es válida.");
      return;
    }
    try {
      await reminderMutations.create.mutateAsync({
        title: `Tarea: ${taskTitle}`,
        body: `Recuerda: ${taskTitle}`,
        triggerAt: new Date(due.getTime() - reminderLead * 60_000).toISOString(),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        ...(recurrence?.repeatType
          ? {
              repeatType: recurrence.repeatType,
              repeatInterval: recurrence.repeatInterval ?? 1,
              repeatDaysOfWeek: recurrence.repeatDaysOfWeek ?? [],
            }
          : {}),
        payload: { type: "TASK_DUE", taskId },
      });
      setComposerOpen(false);
      toast.success("¡Recordatorio creado!");
    } catch {
      toast.error("Ups, no pudimos crear el recordatorio. Inténtalo de nuevo.");
    }
  };

  const removeReminder = async (id: string) => {
    try {
      await reminderMutations.remove.mutateAsync(id);
      toast.success("Recordatorio eliminado");
    } catch {
      toast.error("Ups, no pudimos eliminar el recordatorio. Inténtalo de nuevo.");
    }
  };

  return (
    <section aria-labelledby={headingId} className="rounded-2xl border border-outline-variant/70 bg-surface-container-low/40 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary-fixed text-primary">
            <Bell aria-hidden="true" size={17} />
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-label-md text-label-md font-semibold text-on-surface" id={headingId}>Recordatorios</h3>
              <span className="rounded-full bg-surface-container px-2 py-0.5 font-data-mono text-data-mono text-[10px] text-on-surface-variant">
                {taskReminders.length}
              </span>
            </div>
            <p className="mt-0.5 font-body-sm text-body-sm text-on-surface-variant">Recibe un aviso antes del vencimiento.</p>
          </div>
        </div>
        <button
          aria-controls={composerId}
          aria-expanded={composerOpen}
          className="inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-lg border border-outline-variant bg-surface-container-lowest px-2.5 font-label-md text-label-md font-semibold text-primary shadow-sm hover:bg-primary-fixed disabled:cursor-not-allowed disabled:opacity-50"
          disabled={!dueDate || reminderMutations.create.isPending}
          onClick={() => setComposerOpen((open) => !open)}
          type="button"
        >
          <Plus aria-hidden="true" size={14} /> Añadir
        </button>
      </div>
      {taskReminders.length > 0 ? (
        <div className="mt-4 divide-y divide-outline-variant/70 rounded-xl border border-outline-variant/70 bg-surface-container-lowest px-3">
          {taskReminders.map((reminder) => (
            <div className="flex items-center gap-3 py-2.5" key={reminder.id}>
              <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary-fixed text-primary">
                <Bell aria-hidden="true" size={14} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-body-sm text-body-sm font-semibold text-on-surface">{formatReminderTrigger(reminder.triggerAt)}</p>
                <p className="font-data-mono text-data-mono text-[10px] text-on-surface-variant">
                  {reminder.repeatType ? repeatLabel(reminder.repeatType, reminder.repeatInterval) : "Aviso único"}
                </p>
              </div>
              <button
                aria-label="Eliminar recordatorio"
                className="flex size-8 shrink-0 items-center justify-center rounded-lg text-on-surface-variant hover:bg-error-container/40 hover:text-error disabled:cursor-wait disabled:opacity-50"
                disabled={reminderMutations.remove.isPending}
                onClick={() => void removeReminder(reminder.id)}
                title="Eliminar recordatorio"
                type="button"
              >
                <X aria-hidden="true" size={15} />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-4 rounded-xl border border-dashed border-outline-variant px-3 py-3 font-body-sm text-body-sm text-on-surface-variant">Aún no hay avisos para esta tarea.</p>
      )}
      {composerOpen && dueDate && (
        <div className="mt-3 rounded-xl bg-surface-container-lowest p-3 ring-1 ring-outline-variant/70" id={composerId}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-label-md text-label-md font-semibold text-on-surface">Nuevo aviso</p>
              <p className="mt-0.5 font-body-sm text-body-sm text-on-surface-variant">Elige cuánto antes quieres recibirlo.</p>
            </div>
            <button
              aria-label="Cerrar nuevo aviso"
              className="flex size-8 items-center justify-center rounded-lg text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"
              onClick={() => setComposerOpen(false)}
              type="button"
            >
              <X aria-hidden="true" size={15} />
            </button>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <select
              aria-label="Cuánto antes avisar"
              className="field h-11 min-w-0 flex-1"
              disabled={reminderMutations.create.isPending}
              onChange={(event) => setReminderLead(Number(event.target.value))}
              value={reminderLead}
            >
              {REMINDER_LEADS.map((lead) => (
                <option key={lead.minutes} value={lead.minutes}>{lead.label}</option>
              ))}
            </select>
            <button
              className="flex min-h-11 items-center gap-1.5 rounded-lg bg-primary px-3 font-label-md text-label-md font-semibold text-on-primary hover:bg-primary/90 disabled:cursor-wait disabled:opacity-50"
              disabled={reminderMutations.create.isPending}
              onClick={() => void createReminder()}
              type="button"
            >
              {reminderMutations.create.isPending ? "Guardando..." : "Guardar"}
            </button>
          </div>
        </div>
      )}
      {!dueDate && <p className="mt-3 font-body-sm text-body-sm text-on-surface-variant">Añade una fecha límite para activar los recordatorios.</p>}
    </section>
  );
}
