"use client";

import { Bell, Timer, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useModalScrollLock } from "@/hooks/useModalScrollLock";
import type { Project, Task, TaskPriority, TaskStatus } from "@/types/entities";
import { useProjectMembers } from "@/features/projects/hooks/useProjects";
import { CommentThread } from "@/features/comments/CommentThread";
import { useReminderMutations, useRemindersQuery } from "@/features/reminders/hooks/useReminders";
import { useTaskQuery } from "../hooks/useTasks";
import { taskSchema, type TaskRecurrenceFormData } from "../schemas/task.schema";
import { localDateKey } from "@/lib/utils";

export type TaskForm = {
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate?: string;
  pomodoroEstimate: number;
  projectId?: string;
  assigneeId?: string | null;
  recurrence?: TaskRecurrenceFormData;
};

const emptyRecurrence: TaskRecurrenceFormData = {
  repeatType: undefined,
  repeatInterval: 1,
  repeatDaysOfWeek: [],
  repeatEndsAt: undefined,
};

const emptyForm: TaskForm = {
  title: "",
  description: "",
  status: "PENDING",
  priority: "NORMAL",
  dueDate: "",
  pomodoroEstimate: 0,
  recurrence: emptyRecurrence,
};

const REMINDER_LEADS: { label: string; minutes: number }[] = [
  { label: "Hora exacta", minutes: 0 },
  { label: "5 min antes", minutes: 5 },
  { label: "10 min antes", minutes: 10 },
  { label: "20 min antes", minutes: 20 },
  { label: "30 min antes", minutes: 30 },
  { label: "1 hora antes", minutes: 60 },
  { label: "1 día antes", minutes: 1440 },
];

const WEEKDAY_LETTERS = ["D", "L", "M", "X", "J", "V", "S"];

function formatTrigger(value: string) {
  return new Intl.DateTimeFormat("es-CO", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

export function TaskModal({
  task,
  initialForm,
  projects,
  defaultProjectId,
  onClose,
  onSave,
  onDelete,
  onStartPomodoro,
  onAddSubtask,
  onToggleSubtask,
  onDeleteSubtask,
}: {
  task: Task | null;
  initialForm?: Partial<TaskForm>;
  projects: Project[];
  defaultProjectId?: string;
  onClose: () => void;
  onSave: (form: TaskForm) => Promise<void>;
  onDelete?: () => Promise<void>;
  onStartPomodoro?: () => void;
  onAddSubtask: (taskId: string, title: string) => Promise<void>;
  onToggleSubtask: (
    taskId: string,
    subtaskId: string,
    completed: boolean,
  ) => Promise<void>;
  onDeleteSubtask: (taskId: string, subtaskId: string) => Promise<void>;
}) {
  const { data: detail } = useTaskQuery(task?.id ?? null);
  const current = detail ?? task;
  const defaultProject = projects.find((project) => project.isDefault);
  const [form, setForm] = useState<TaskForm>(() =>
    task
      ? {
          title: task.title,
          description: task.description ?? "",
          status: task.status,
          priority: task.priority,
          dueDate: task.dueDate ? localDateKey(task.dueDate) : "",
          pomodoroEstimate: task.pomodoroEstimate,
          projectId: task.projectId ?? defaultProjectId ?? defaultProject?.id ?? "",
          assigneeId: task.assigneeId ?? null,
          recurrence: task.recurrenceType
            ? {
                repeatType: task.recurrenceType,
                repeatInterval: task.recurrenceInterval,
                repeatDaysOfWeek: task.recurrenceDaysOfWeek,
                repeatDayOfMonth: task.recurrenceDayOfMonth ?? undefined,
                repeatEndsAt: task.recurrenceEndsAt
                  ? localDateKey(task.recurrenceEndsAt)
                  : undefined,
              }
            : emptyRecurrence,
        }
      : { ...emptyForm, ...initialForm, projectId: initialForm?.projectId ?? defaultProjectId ?? defaultProject?.id ?? "" },
  );
  const [subtaskTitle, setSubtaskTitle] = useState("");
  const [error, setError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const currentProjectId = form.projectId && form.projectId !== "" ? form.projectId : null;
  const membersQuery = useProjectMembers(currentProjectId);
  const members = membersQuery.data ?? [];
  const reminderQuery = useRemindersQuery();
  const reminderMutations = useReminderMutations();
  const [reminderLead, setReminderLead] = useState(1440);
  const taskReminders = (reminderQuery.data ?? []).filter(
    (reminder) => reminder.payload?.taskId === current?.id,
  );

  useModalScrollLock();

  if (!task && current) return null;
  const subtasks = current?.subtasks ?? [];
  const submit = async () => {
    const result = taskSchema.safeParse(form);
    if (!result.success) {
      setError(result.error.issues[0]?.message ?? "Revisa los datos e inténtalo de nuevo");
      return;
    }
    setError("");
    await onSave(result.data);
  };
  const addSubtask = async () => {
    if (!current || !subtaskTitle.trim()) return;
    await onAddSubtask(current.id, subtaskTitle.trim());
    setSubtaskTitle("");
  };
  const setRecurrence = (patch: Partial<TaskRecurrenceFormData>) => {
    setForm({ ...form, recurrence: { ...(form.recurrence ?? emptyRecurrence), ...patch } });
  };
  const toggleWeekday = (day: number) => {
    const days = [...(form.recurrence?.repeatDaysOfWeek ?? [])];
    const index = days.indexOf(day);
    if (index >= 0) days.splice(index, 1);
    else days.push(day);
    setRecurrence({ repeatDaysOfWeek: days });
  };
  const createReminder = async () => {
    if (!current || !current.dueDate) {
      toast.error("La tarea necesita fecha límite para recordarla.");
      return;
    }
    const due = new Date(current.dueDate);
    const triggerAt = new Date(due.getTime() - reminderLead * 60_000).toISOString();
    try {
      await reminderMutations.create.mutateAsync({
        title: `Tarea: ${current.title}`,
        body: `Recuerda: ${current.title}`,
        triggerAt,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        ...(current.recurrenceType
          ? {
              repeatType: current.recurrenceType,
              repeatInterval: current.recurrenceInterval,
              repeatDaysOfWeek: current.recurrenceDaysOfWeek,
            }
          : {}),
        payload: { type: "TASK_DUE", taskId: current.id },
      });
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
    <div
      aria-modal="true"
      className="fixed inset-0 z-[60] flex items-center justify-center bg-on-surface/20 p-4 backdrop-blur-[1px]"
      role="dialog"
    >
      <div className="flex max-h-[90vh] w-full max-w-lg flex-col border border-outline-variant bg-surface shadow-none">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-outline-variant bg-surface-bright px-5 py-4">
          <h2 className="font-headline-xs text-headline-xs font-bold text-primary">
            {task ? "Editar tarea" : "Nueva tarea"}
          </h2>
          <div className="flex flex-1 items-center justify-between gap-2 sm:flex-none sm:justify-start">
            <div className="flex items-center gap-2">
              {task && onStartPomodoro && (
                <button
                  className="flex items-center gap-1 border border-outline-variant px-2.5 py-1.5 font-body-sm text-body-sm text-primary hover:bg-surface-container-high"
                  onClick={onStartPomodoro}
                  type="button"
                >
                  <Timer size={14} /> Pomodoro
                </button>
              )}
            </div>
            <button
              aria-label="Cerrar"
              className="text-on-surface-variant hover:text-on-surface"
              onClick={onClose}
              type="button"
            >
              <X size={19} />
            </button>
          </div>
        </div>
        <div className="space-y-4 overflow-y-auto p-5" data-modal-scroll>
           <label className="block">
            <span className="font-label-caps text-label-caps text-on-surface-variant">
              TÍTULO
            </span>
            <input
              autoFocus
              className="field mt-1"
              onChange={(event) =>
                setForm({ ...form, title: event.target.value })
              }
              value={form.title}
            />
          </label>
          <label className="block">
            <span className="font-label-caps text-label-caps text-on-surface-variant">
              DESCRIPCIÓN
            </span>
            <textarea
              className="field mt-1 h-20 resize-y py-2"
              onChange={(event) =>
                setForm({ ...form, description: event.target.value })
              }
              value={form.description}
            />
          </label>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="font-label-caps text-label-caps text-on-surface-variant">
                PROYECTO
              </span>
              <select
                className="field mt-1"
                onChange={(event) =>
                  setForm({ ...form, projectId: event.target.value, assigneeId: null })
                }
                value={form.projectId ?? ""}
              >
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="font-label-caps text-label-caps text-on-surface-variant">
                ASIGNADO A
              </span>
              <select
                className="field mt-1"
                disabled={!currentProjectId}
                onChange={(event) =>
                  setForm({ ...form, assigneeId: event.target.value || null })
                }
                value={form.assigneeId ?? ""}
              >
                <option value="">Sin asignar</option>
                {members.map((member) => (
                  <option key={member.id} value={member.userId}>
                    {member.user.name ?? member.user.email}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="font-label-caps text-label-caps text-on-surface-variant">
                PRIORIDAD
              </span>
              <select
                className="field mt-1"
                onChange={(event) =>
                  setForm({
                    ...form,
                    priority: event.target.value as TaskPriority,
                  })
                }
                value={form.priority}
              >
                <option value="URGENT">Urgente</option>
                <option value="HIGH">Alta</option>
                <option value="NORMAL">Normal</option>
                <option value="LOW">Baja</option>
              </select>
            </label>
            <label className="block">
              <span className="font-label-caps text-label-caps text-on-surface-variant">
                FECHA LÍMITE
              </span>
              <input
                className="field mt-1"
                onChange={(event) =>
                  setForm({ ...form, dueDate: event.target.value })
                }
                type="date"
                value={form.dueDate}
              />
            </label>
            <label className="block">
              <span className="font-label-caps text-label-caps text-on-surface-variant">
                ESTIMADO POMODOROS
              </span>
              <input
                className="field mt-1"
                min={0}
                onChange={(event) =>
                  setForm({
                    ...form,
                    pomodoroEstimate: Number(event.target.value) || 0,
                  })
                }
                type="number"
                value={form.pomodoroEstimate}
              />
            </label>
            <label className="block">
              <span className="font-label-caps text-label-caps text-on-surface-variant">
                ESTADO
              </span>
              <select
                className="field mt-1"
                onChange={(event) =>
                  setForm({
                    ...form,
                    status: event.target.value as TaskStatus,
                  })
                }
                value={form.status}
              >
                <option value="PENDING">Pendiente</option>
                <option value="IN_PROGRESS">En progreso</option>
                <option value="COMPLETED">Completada</option>
                <option value="CANCELLED">Cancelada</option>
              </select>
            </label>
          </div>
          <section className="border-t border-outline-variant pt-4">
            <span className="font-label-caps text-label-caps text-on-surface-variant">
              REPETIR
            </span>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {([
                ["", "No repetir"],
                ["DAILY", "Cada día"],
                ["WEEKLY", "Cada semana"],
                ["MONTHLY", "Cada mes"],
              ] as const).map(([value, label]) => (
                <button
                  className={`border px-3 py-1.5 font-body-sm text-body-sm ${form.recurrence?.repeatType === value ? "bg-primary-container text-on-primary" : "border-outline-variant hover:bg-surface-container-low hover:text-primary"}`}
                  key={value}
                  onClick={() =>
                    setRecurrence({
                      repeatType: value === "" ? undefined : value,
                      repeatDaysOfWeek: value === "WEEKLY" ? (form.recurrence?.repeatDaysOfWeek ?? []) : [],
                    })
                  }
                  type="button"
                >
                  {label}
                </button>
              ))}
            </div>
            {form.recurrence?.repeatType === "WEEKLY" && (
              <div className="mt-3 flex items-center gap-1">
                {WEEKDAY_LETTERS.map((letter, day) => (
                  <button
                    aria-label={`${letter}${form.recurrence?.repeatDaysOfWeek.includes(day) ? " (seleccionado)" : ""}`}
                    className={`h-8 w-8 border font-data-mono text-data-mono text-sm ${form.recurrence?.repeatDaysOfWeek.includes(day) ? "border-primary bg-primary-container text-on-primary" : "border-outline-variant text-on-surface-variant hover:bg-surface-container-low"}`}
                    key={day}
                    onClick={() => toggleWeekday(day)}
                    type="button"
                  >
                    {letter}
                  </button>
                ))}
              </div>
            )}
            {form.recurrence?.repeatType && (
              <div className="mt-3 grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="font-label-caps text-label-caps text-on-surface-variant">
                    CADA N
                  </span>
                  <input
                    className="field mt-1"
                    min={1}
                    max={365}
                    onChange={(event) =>
                      setRecurrence({ repeatInterval: Number(event.target.value) || 1 })
                    }
                    type="number"
                    value={form.recurrence?.repeatInterval ?? 1}
                  />
                </label>
                <label className="block">
                  <span className="font-label-caps text-label-caps text-on-surface-variant">
                    HASTA (OPCIONAL)
                  </span>
                  <input
                    className="field mt-1"
                    onChange={(event) =>
                      setRecurrence({ repeatEndsAt: event.target.value || undefined })
                    }
                    type="date"
                    value={form.recurrence?.repeatEndsAt ?? ""}
                  />
                </label>
              </div>
            )}
          </section>
          {task && current && (
            <section className="border-t border-outline-variant pt-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="font-label-caps text-label-caps text-on-surface-variant">
                  RECORDATORIOS
                </span>
                <span className="font-data-mono text-data-mono text-xs text-on-surface-variant">
                  {taskReminders.length}{" "}
                  {taskReminders.length === 1 ? "aviso" : "avisos"}
                </span>
              </div>
              {taskReminders.length > 0 && (
                <div className="mb-3 space-y-1">
                  {taskReminders.map((reminder) => (
                    <div
                      className="flex items-center gap-2 border-b border-outline-variant py-2"
                      key={reminder.id}
                    >
                      <Bell className="shrink-0 text-primary" size={14} />
                      <span className="flex-1 font-data-mono text-data-mono text-xs text-on-surface-variant">
                        {formatTrigger(reminder.triggerAt)}
                        {reminder.repeatType
                          ? ` · ${reminder.repeatType === "DAILY" ? "cada día" : reminder.repeatType === "WEEKLY" ? "cada semana" : "cada mes"}`
                          : ""}
                      </span>
                      <button
                        aria-label="Eliminar recordatorio"
                        className="text-xs text-on-surface-variant hover:text-error"
                        onClick={() => void removeReminder(reminder.id)}
                        type="button"
                      >
                        Eliminar
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex flex-wrap items-center gap-2">
                <select
                  aria-label="Cuánto antes avisar"
                  className="field h-8 min-w-0 flex-1"
                  onChange={(event) => setReminderLead(Number(event.target.value))}
                  value={reminderLead}
                >
                  {REMINDER_LEADS.map((lead) => (
                    <option key={lead.minutes} value={lead.minutes}>
                      {lead.label}
                    </option>
                  ))}
                </select>
                <button
                  className="flex items-center gap-1 border border-outline-variant px-3 py-1.5 font-body-sm text-body-sm text-primary hover:bg-surface-container-high"
                  onClick={() => void createReminder()}
                  type="button"
                >
                  <Bell size={13} /> Añadir
                </button>
              </div>
              {!current.dueDate && (
                <p className="mt-1.5 font-body-sm text-body-sm text-on-surface-variant">
                  Ponle fecha límite para poder recordarla.
                </p>
              )}
            </section>
          )}
          {task && current && (
            <section className="border-t border-outline-variant pt-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="font-label-caps text-label-caps text-on-surface-variant">
                  SUBTAREAS
                </span>
                <span className="font-data-mono text-data-mono text-xs text-on-surface-variant">
                  {subtasks.filter((subtask) => subtask.completed).length}/
                  {subtasks.length}
                </span>
              </div>
              <div className="mb-2 flex gap-2">
                <input
                  className="field h-8"
                  onChange={(event) => setSubtaskTitle(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") void addSubtask();
                  }}
                  placeholder="Añadir subtarea..."
                  value={subtaskTitle}
                />
                <button
                  className="border border-outline-variant px-3 text-body-sm hover:bg-surface-container-high"
                  onClick={() => void addSubtask()}
                  type="button"
                >
                  Añadir
                </button>
              </div>
              <div className="space-y-1">
                {subtasks.map((subtask) => (
                  <div
                    className="flex items-center gap-2 border-b border-outline-variant py-2"
                    key={subtask.id}
                  >
                    <input
                      checked={subtask.completed}
                      className="h-4 w-4 accent-primary"
                      onChange={() =>
                        void onToggleSubtask(
                          current.id,
                          subtask.id,
                          !subtask.completed,
                        )
                      }
                      type="checkbox"
                    />
                    <span
                      className={`flex-1 font-body-sm text-body-sm ${subtask.completed ? "line-through text-on-surface-variant" : ""}`}
                    >
                      {subtask.title}
                    </span>
                    <button
                      className="text-xs text-on-surface-variant hover:text-error"
                      onClick={() =>
                        void onDeleteSubtask(current.id, subtask.id)
                      }
                      type="button"
                    >
                      Eliminar
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}
          {task && current && (
            <section className="border-t border-outline-variant pt-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="font-label-caps text-label-caps text-on-surface-variant">
                  COMENTARIOS
                </span>
              </div>
              <div className="h-64">
                <CommentThread kind="task" id={current.id} />
              </div>
            </section>
          )}
          {error && (
            <p className="font-body-sm text-body-sm text-error">{error}</p>
          )}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-outline-variant bg-surface-container-low px-5 py-4 sm:gap-3">
          {task && onDelete ? (
            <button
              className={`${confirmDelete ? "bg-error px-3 py-2 font-body-sm text-body-sm text-error-foreground" : "px-2 py-2 font-body-sm text-body-sm text-error hover:bg-error-container/30"} whitespace-nowrap`}
              onClick={() => {
                if (!confirmDelete) {
                  setConfirmDelete(true);
                  return;
                }
                void onDelete();
              }}
              type="button"
            >
              {confirmDelete ? "¿Eliminar tarea?" : "Eliminar"}
            </button>
          ) : <span />}
          <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-3">
            <button
              className="whitespace-nowrap border border-outline-variant bg-surface-container-lowest px-4 py-2 font-body-sm text-body-sm hover:bg-surface-container-high"
              onClick={onClose}
              type="button"
            >
              Cancelar
            </button>
            <button
              className="whitespace-nowrap bg-primary-container px-4 py-2 font-body-sm text-body-sm text-on-primary hover:bg-primary"
              onClick={() => void submit()}
              type="button"
            >
              {task ? "Guardar cambios" : "Crear tarea"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
