"use client";

import { Bell, Plus, Repeat2, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import type { ReminderRepeatType } from "@/types/entities";
import { useReminderMutations, useRemindersQuery } from "@/features/reminders/hooks/useReminders";
import { isTaskOverdue } from "@/lib/utils";

const REMINDER_LEADS: { label: string; minutes: number }[] = [
  { label: "Hora exacta", minutes: 0 },
  { label: "5 min antes", minutes: 5 },
  { label: "10 min antes", minutes: 10 },
  { label: "20 min antes", minutes: 20 },
  { label: "30 min antes", minutes: 30 },
  { label: "1 hora antes", minutes: 60 },
  { label: "1 día antes", minutes: 1440 },
];

const REMINDER_SAFETY_WINDOW_MS = 5_000;

export type TaskReminderRecurrence = {
  repeatType?: ReminderRepeatType | null;
  repeatInterval?: number;
  repeatDaysOfWeek?: number[];
};

function formatReminderTrigger(value: string) {
  const date = new Date(value);
  const today = new Date();
  const dateOnly = (current: Date) => new Date(current.getFullYear(), current.getMonth(), current.getDate()).getTime();
  const dayDifference = Math.round((dateOnly(date) - dateOnly(today)) / 86_400_000);
  const time = date.toLocaleTimeString("es-CO", { hour: "numeric", minute: "2-digit" });

  if (dayDifference === 0) return `Hoy, ${time}`;
  if (dayDifference === 1) return `Mañana, ${time}`;
  return `${date.toLocaleDateString("es-CO", { day: "numeric", month: "short" })}, ${time}`;
}

function repeatLabel(type: ReminderRepeatType, interval: number) {
  if (type === "DAILY") return interval === 1 ? "Cada día" : `Cada ${interval} días`;
  if (type === "WEEKLY") return interval === 1 ? "Cada semana" : `Cada ${interval} semanas`;
  return interval === 1 ? "Cada mes" : `Cada ${interval} meses`;
}

function getAvailableReminderLeads(dueDate: string | null) {
  const dueTimestamp = dueDate ? new Date(dueDate).getTime() : Number.NaN;
  if (!Number.isFinite(dueTimestamp)) return [];
  return REMINDER_LEADS.filter(({ minutes }) => dueTimestamp - minutes * 60_000 > Date.now() + REMINDER_SAFETY_WINDOW_MS);
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
  const [availableReminderLeads, setAvailableReminderLeads] = useState(REMINDER_LEADS);
  const [reminderUnavailable, setReminderUnavailable] = useState(false);
  const taskReminders = (reminderQuery.data ?? []).filter((reminder) => reminder.payload?.taskId === taskId);
  const composerId = `task-reminder-composer-${taskId}`;
  const headingId = `task-reminders-heading-${taskId}`;
  const dueDatePast = isTaskOverdue({ dueDate, status: "PENDING" });
  const canAddReminder = Boolean(dueDate) && !dueDatePast;

  if ((!dueDate || dueDatePast) && taskReminders.length === 0) return null;

  const toggleComposer = () => {
    if (composerOpen) {
      setComposerOpen(false);
      return;
    }
    const available = getAvailableReminderLeads(dueDate);
    if (available.length === 0) {
      setAvailableReminderLeads([]);
      setReminderUnavailable(true);
      return;
    }
    setReminderUnavailable(false);
    setAvailableReminderLeads(available);
    setReminderLead((current) => available.some(({ minutes }) => minutes === current) ? current : available[available.length - 1].minutes);
    setComposerOpen(true);
  };

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
    const available = getAvailableReminderLeads(dueDate);
    const selectedReminderLead = available.some(({ minutes }) => minutes === reminderLead)
      ? reminderLead
      : available[available.length - 1]?.minutes ?? null;
    if (selectedReminderLead === null) {
      setAvailableReminderLeads([]);
      setReminderUnavailable(true);
      setComposerOpen(false);
      toast.error("La fecha límite debe permitir un aviso futuro.");
      return;
    }
    const triggerAt = new Date(due.getTime() - selectedReminderLead * 60_000);
    if (triggerAt.getTime() <= Date.now()) {
      toast.error("Elige una fecha límite más adelante para crear el aviso.");
      return;
    }
    try {
      await reminderMutations.create.mutateAsync({
        title: `Tarea: ${taskTitle}`,
        body: `Recuerda: ${taskTitle}`,
        triggerAt: triggerAt.toISOString(),
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
    <section aria-labelledby={headingId} className="rounded-xl border border-outline-variant/70 bg-surface-container-low/30 px-3 py-2.5">
      <div className="flex items-center gap-3">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary-fixed text-primary">
          <Bell aria-hidden="true" size={16} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-label-md text-label-md font-semibold text-on-surface" id={headingId}>Recordatorios</h3>
            {taskReminders.length > 0 && <span aria-label={`${taskReminders.length} recordatorios`} className="rounded-full bg-surface-container px-1.5 py-0.5 font-data-mono text-data-mono text-[10px] text-on-surface-variant">{taskReminders.length}</span>}
          </div>
        </div>
        {canAddReminder && (
          <button
            aria-controls={composerId}
            aria-expanded={composerOpen}
            aria-label={composerOpen ? "Cerrar opciones de recordatorio" : "Añadir recordatorio"}
            className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-outline-variant bg-surface-container-lowest text-primary shadow-sm hover:bg-primary-fixed disabled:cursor-not-allowed disabled:opacity-50"
            disabled={reminderMutations.create.isPending}
            onClick={toggleComposer}
            title="Añadir recordatorio"
            type="button"
          >
            {composerOpen ? <X aria-hidden="true" size={15} /> : <Plus aria-hidden="true" size={15} />}
          </button>
        )}
      </div>
      {taskReminders.length > 0 && (
        <div className="mt-3 space-y-1.5">
          {taskReminders.map((reminder) => (
            <div className="group flex items-center gap-3 rounded-xl border border-outline-variant/70 bg-surface-container-lowest px-3 py-2.5 transition-colors hover:bg-surface-container-low" key={reminder.id}>
              <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary-fixed text-primary">
                <Bell aria-hidden="true" size={14} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-body-sm text-body-sm font-semibold text-on-surface">{formatReminderTrigger(reminder.triggerAt)}</p>
                {reminder.repeatType && (
                  <p className="mt-0.5 inline-flex items-center gap-1 font-data-mono text-data-mono text-[10px] text-on-surface-variant">
                    <Repeat2 aria-hidden="true" size={11} /> {repeatLabel(reminder.repeatType, reminder.repeatInterval)}
                  </p>
                )}
              </div>
              <button
                aria-label={`Eliminar recordatorio de ${formatReminderTrigger(reminder.triggerAt)}`}
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
      )}
      {composerOpen && canAddReminder && availableReminderLeads.length > 0 && (
        <div className="mt-2 flex gap-2 border-t border-outline-variant/70 pt-2" id={composerId}>
          <label className="sr-only" htmlFor={`${composerId}-lead`}>Cuánto antes avisar</label>
          <select
            className="field h-10 min-w-0 flex-1"
            disabled={reminderMutations.create.isPending}
            id={`${composerId}-lead`}
            onChange={(event) => setReminderLead(Number(event.target.value))}
            value={reminderLead}
          >
            {availableReminderLeads.map((lead) => (
              <option key={lead.minutes} value={lead.minutes}>{lead.label}</option>
            ))}
          </select>
          <button
            className="min-h-10 rounded-lg bg-primary px-3 font-label-md text-label-md font-semibold text-on-primary hover:bg-primary/90 disabled:cursor-wait disabled:opacity-50"
            disabled={reminderMutations.create.isPending}
            onClick={() => void createReminder()}
            type="button"
          >
            {reminderMutations.create.isPending ? "..." : "Guardar"}
          </button>
        </div>
      )}
      {!dueDate && taskReminders.length > 0 && <p className="mt-1 font-body-sm text-body-sm text-on-surface-variant">Añade una fecha límite para nuevos avisos.</p>}
      {reminderUnavailable && (
        <p className="mt-1 font-body-sm text-body-sm text-on-surface-variant">
          La fecha límite ya pasó o está demasiado cerca para avisar.
        </p>
      )}
    </section>
  );
}
