"use client";

import { ChevronDown, ChevronUp, X } from "lucide-react";
import { useState } from "react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Project, Task, TaskPriority, TaskStatus } from "@/types/entities";
import { useProjectMembers } from "@/features/projects/hooks/useProjects";
import { CommentThread } from "@/features/comments/CommentThread";
import { useTaskQuery } from "../hooks/useTasks";
import { taskSchema, type TaskRecurrenceFormData } from "../schemas/task.schema";
import { TaskReminderPanel } from "./TaskReminderPanel";
import { localDateKey, toDatetimeLocal } from "@/lib/utils";

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

const WEEKDAY_LETTERS = ["D", "L", "M", "X", "J", "V", "S"];

export function TaskModal({
  task,
  initialForm,
  projects,
  defaultProjectId,
  onClose,
  onSave,
  onDelete,
}: {
  task: Task | null;
  initialForm?: Partial<TaskForm>;
  projects: Project[];
  defaultProjectId?: string;
  onClose: () => void;
  onSave: (form: TaskForm) => Promise<void>;
  onDelete?: () => Promise<void>;
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
           dueDate: task.dueDate ? toDatetimeLocal(task.dueDate) : "",
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
      : {
          ...emptyForm,
          ...initialForm,
          projectId: initialForm?.projectId ?? defaultProjectId ?? defaultProject?.id ?? "",
        },
   );
  const [error, setError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(Boolean(task));
  const currentProjectId = form.projectId && form.projectId !== "" ? form.projectId : null;
  const membersQuery = useProjectMembers(currentProjectId);
  const members = membersQuery.data ?? [];
  const dueDateDay = form.dueDate?.slice(0, 10) ?? "";
  const dueDateTime = form.dueDate?.slice(11, 16) ?? "";
  const updateDueDateDay = (value: string) => {
    setForm({
      ...form,
      dueDate: value ? `${value}T${dueDateTime || "23:59"}` : "",
    });
  };
  const updateDueDateTime = (value: string) => {
    setForm({
      ...form,
      dueDate: value
        ? `${dueDateDay || localDateKey(new Date())}T${value}`
        : dueDateDay,
    });
  };

  if (!task && current) return null;
  const submit = async () => {
    const result = taskSchema.safeParse(form);
    if (!result.success) {
      setError(result.error.issues[0]?.message ?? "Revisa los datos e inténtalo de nuevo");
      return;
    }
    setError("");
    await onSave(result.data);
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
  return (
    <Dialog open onOpenChange={(nextOpen) => { if (!nextOpen) onClose(); }}>
      <DialogContent
        className="fixed bottom-0 left-0 right-0 top-auto flex h-[min(92dvh,48rem)] max-h-[92dvh] w-full max-w-none translate-x-0 translate-y-0 flex-col gap-0 overflow-hidden rounded-t-2xl border-outline-variant bg-surface p-0 sm:bottom-0 sm:left-auto sm:right-0 sm:top-0 sm:h-full sm:max-h-none sm:w-[min(32rem,100vw)] sm:translate-x-0 sm:translate-y-0 sm:rounded-l-2xl sm:rounded-r-none"
        data-keyboard-sheet
        showCloseButton={false}
        onOpenAutoFocus={(event) => {
          if (task) {
            event.preventDefault();
          }
        }}
      >
         <DialogHeader className="flex shrink-0 flex-row items-center justify-between gap-3 border-b border-outline-variant bg-surface-bright px-5 py-4 text-left">
           <div className="min-w-0 flex-1">
             <DialogTitle className="truncate font-headline-xs text-headline-xs font-bold normal-case tracking-normal text-primary">
               {task ? "Editar tarea" : "Nueva tarea"}
             </DialogTitle>
             <DialogDescription className="sr-only">Edita los detalles, recordatorios y subtareas de la tarea.</DialogDescription>
           </div>
            <div className="flex shrink-0 items-center gap-2">
              <DialogClose asChild>
               <button aria-label="Cerrar" className="flex h-10 w-10 items-center justify-center rounded-md text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface" type="button">
                 <X size={19} />
               </button>
             </DialogClose>
           </div>
         </DialogHeader>
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5" data-modal-scroll>
<label className="block">
             <span className="font-label-caps text-label-caps text-on-surface-variant">
               TÍTULO
             </span>
             <input
               className="field mt-1"
               onChange={(event) =>
                 setForm({ ...form, title: event.target.value })
               }
               value={form.title}
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
                  PRIORIDAD
               </span>
              <select
                className="field mt-1 min-h-11"
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
              <fieldset className="min-w-0">
                <legend className="font-label-caps text-label-caps text-on-surface-variant">
                  VENCE (OPCIONAL)
                </legend>
                <div className="mt-1 grid grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] gap-2">
                  <label className="min-w-0">
                    <span className="sr-only">Día de vencimiento</span>
                    <input
                      aria-label="Día de vencimiento"
                      className="field min-h-11 w-full min-w-0"
                      onChange={(event) => updateDueDateDay(event.target.value)}
                      type="date"
                      value={dueDateDay}
                    />
                  </label>
                  <label className="min-w-0">
                    <span className="sr-only">Hora de vencimiento</span>
                    <input
                      aria-label="Hora de vencimiento"
                      className="field min-h-11 w-full min-w-0"
                      onChange={(event) => updateDueDateTime(event.target.value)}
                      type="time"
                      value={dueDateTime}
                    />
                  </label>
                </div>
                {form.dueDate && (
                  <button
                    className="mt-1 min-h-9 rounded-md px-2 font-label-md text-label-md text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface"
                    onClick={() => setForm({ ...form, dueDate: "" })}
                    type="button"
                  >
                    Quitar vencimiento
                  </button>
                )}
              </fieldset>
           </div>
           <button
             aria-controls="task-advanced-options"
             aria-expanded={showAdvanced}
             className="flex w-full items-center gap-2 border-t border-outline-variant pt-4 text-left font-body-sm text-body-sm text-primary hover:text-primary"
             onClick={() => setShowAdvanced((open) => !open)}
             type="button"
           >
             <span>{showAdvanced ? "Ocultar opciones avanzadas" : "Más opciones"}</span>
             <span aria-hidden="true" className="h-px flex-1 bg-outline-variant" />
             {showAdvanced ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
             {showAdvanced && (
              <>
              <div className="space-y-4 rounded-lg border border-outline-variant bg-surface-container-low/40 p-4" id="task-advanced-options">
            <p className="font-label-caps text-label-caps text-on-surface-variant">
              OPCIONES AVANZADAS
            </p>
            <label className="block">
              <span className="font-label-caps text-label-caps text-on-surface-variant">
                DESCRIPCIÓN
              </span>
             <textarea
               className="field mt-1 h-20 resize-y py-2 min-h-11"
               onChange={(event) =>
                 setForm({ ...form, description: event.target.value })
               }
                value={form.description}
              />
            </label>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="font-label-caps text-label-caps text-on-surface-variant">
                  ASIGNADO A
                </span>
                <select
                  className="field mt-1 min-h-11"
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
                  ESTIMADO POMODOROS
                </span>
                <input
                  className="field mt-1 min-h-11"
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
                  className="field mt-1 min-h-11"
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
                   className={`min-h-11 rounded-md border px-3 py-1.5 font-body-sm text-body-sm ${form.recurrence?.repeatType === value ? "bg-primary-container text-on-primary" : "border-outline-variant hover:bg-surface-container-low hover:text-primary"}`}
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
                     className={`min-h-11 min-w-11 rounded-md border font-data-mono text-data-mono text-sm ${form.recurrence?.repeatDaysOfWeek.includes(day) ? "border-primary bg-primary-container text-on-primary" : "border-outline-variant text-on-surface-variant hover:bg-surface-container-low"}`}
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
                    className="field mt-1 min-h-11"
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
                    className="field mt-1 min-h-11"
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
             <TaskReminderPanel
               dueDate={form.dueDate || null}
               recurrence={form.recurrence ? {
                 repeatType: form.recurrence.repeatType,
                 repeatInterval: form.recurrence.repeatInterval,
                 repeatDaysOfWeek: form.recurrence.repeatDaysOfWeek,
               } : undefined}
               taskId={current.id}
               taskTitle={current.title}
             />
           )}
          {task && current && (
            <section className="border-t border-outline-variant pt-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="font-label-caps text-label-caps text-on-surface-variant">
                  COMENTARIOS
                </span>
              </div>
              <div className="h-64 min-h-0 min-w-0 overflow-hidden rounded-lg">
                <CommentThread kind="task" id={current.id} projectId={current.projectId ?? form.projectId} />
               </div>
               </section>
             )}
               </div>
              </>
             )}
           {error && (
            <p className="font-body-sm text-body-sm text-error">{error}</p>
          )}
        </div>
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-outline-variant bg-surface-container-low px-5 py-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] sm:gap-3 sm:pb-4">
          {task && onDelete ? (
            <button
               className={`${confirmDelete ? "bg-error px-3 py-2 font-body-sm text-body-sm text-error-foreground" : "min-h-11 px-2 py-2 font-body-sm text-body-sm text-error hover:bg-error-container/30"} whitespace-nowrap rounded-md`}
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
            <DialogClose asChild>
              <button className="min-h-11 whitespace-nowrap rounded-md border border-outline-variant bg-surface-container-lowest px-4 py-2 font-body-sm text-body-sm hover:bg-surface-container-high" type="button">
                Cancelar
              </button>
            </DialogClose>
            <button
               className="min-h-11 whitespace-nowrap rounded-md bg-primary-container px-4 py-2 font-body-sm text-body-sm text-on-primary hover:bg-primary"
              onClick={() => void submit()}
              type="button"
            >
              {task ? "Guardar cambios" : "Crear tarea"}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
