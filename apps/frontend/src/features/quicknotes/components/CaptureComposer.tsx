"use client";

import { useState } from "react";
import { AlarmClock, CalendarClock, ChevronDown, CircleCheck, FileText, Plus, StickyNote } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { QuickNote, TaskPriority } from "@/types/entities";
import { Button } from "@/components/ui/button";
import { useProjectsQuery } from "@/features/projects/hooks/useProjects";
import { useReminderMutations } from "@/features/reminders/hooks/useReminders";
import { useTaskMutations } from "@/features/tasks/hooks/useTasks";
import { useQuickNoteMutations, useQuickNotesQuery } from "../hooks/useQuickNotes";
import { detectDate, type DetectedDate } from "../utils/detectDate";
import { QuickNoteItem } from "./QuickNoteItem";
import { QuickNoteManager } from "./QuickNoteManager";

export type CaptureMode = "TASK" | "NOTE" | "REMINDER";

type CaptureComposerProps = {
  initialMode?: CaptureMode;
  onClose: () => void;
};

const modes: { value: CaptureMode; label: string; icon: typeof CircleCheck }[] = [
  { value: "TASK", label: "Tarea", icon: CircleCheck },
  { value: "NOTE", label: "Nota", icon: StickyNote },
  { value: "REMINDER", label: "Recordatorio", icon: AlarmClock },
];

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <span className="font-label-caps text-label-caps text-on-surface-variant">{children}</span>;
}

export function CaptureComposer({ initialMode = "TASK", onClose }: CaptureComposerProps) {
  const router = useRouter();
  const [mode, setMode] = useState<CaptureMode>(initialMode);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDueDate, setTaskDueDate] = useState("");
  const [taskPriority, setTaskPriority] = useState<TaskPriority>("NORMAL");
  const [taskProjectId, setTaskProjectId] = useState("");
  const [taskDescription, setTaskDescription] = useState("");
  const [pomodoroEstimate, setPomodoroEstimate] = useState(0);
  const [taskAdvancedOpen, setTaskAdvancedOpen] = useState(false);
  const [noteDraft, setNoteDraft] = useState("");
  const [noteManagerOpen, setNoteManagerOpen] = useState(false);
  const [allNotesOpen, setAllNotesOpen] = useState(false);
  const [reminderTitle, setReminderTitle] = useState("");
  const [reminderBody, setReminderBody] = useState("");
  const [reminderTriggerAt, setReminderTriggerAt] = useState("");
  const [reminderRepeatType, setReminderRepeatType] = useState<"" | "DAILY" | "WEEKLY" | "MONTHLY">("");

  const projectsQuery = useProjectsQuery();
  const taskMutations = useTaskMutations();
  const noteQuery = useQuickNotesQuery("INBOX", 50);
  const noteMutations = useQuickNoteMutations();
  const reminderMutations = useReminderMutations();
  const notes = (noteQuery.data ?? []).filter((note) => note.status === "INBOX");
  const detected = noteDraft.trim() ? detectDate(noteDraft) : null;
  const defaultProject = projectsQuery.data?.find((project) => project.isDefault);
  const effectiveProjectId = taskProjectId || defaultProject?.id || "";

  const saveTask = async () => {
    if (!taskTitle.trim()) {
      toast.error("Ponle un nombre a la tarea.");
      return;
    }
    try {
      await taskMutations.create.mutateAsync({
        title: taskTitle.trim(),
        description: taskDescription.trim() || undefined,
        status: "PENDING",
        priority: taskPriority,
        dueDate: taskDueDate || undefined,
        pomodoroEstimate,
        projectId: effectiveProjectId || undefined,
      });
      setTaskTitle("");
      setTaskDescription("");
      setTaskDueDate("");
      setPomodoroEstimate(0);
      toast.success("¡Listo, tarea creada!");
      onClose();
    } catch {
      toast.error("Ups, no pudimos guardar la tarea. Inténtalo de nuevo.");
    }
  };

  const saveNote = async () => {
    const content = noteDraft.trim();
    if (!content) {
      toast.error("Escribe algo antes de guardar.");
      return;
    }
    try {
      await noteMutations.create.mutateAsync(content);
      setNoteDraft("");
      toast.success("¡Nota guardada!");
    } catch {
      toast.error("Ups, no pudimos guardar tu nota. Inténtalo de nuevo.");
    }
  };

  const saveReminder = async () => {
    if (!reminderTitle.trim() || !reminderTriggerAt) {
      toast.error("Escribe un título y elige cuándo avisarte.");
      return;
    }
    const trigger = new Date(reminderTriggerAt);
    if (Number.isNaN(trigger.getTime())) {
      toast.error("Elige una fecha y hora válidas.");
      return;
    }
    try {
      await reminderMutations.create.mutateAsync({
        title: reminderTitle.trim(),
        body: reminderBody.trim() || undefined,
        triggerAt: trigger.toISOString(),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        ...(reminderRepeatType
          ? {
              repeatType: reminderRepeatType,
              repeatInterval: 1,
              repeatDaysOfWeek: reminderRepeatType === "WEEKLY" ? [trigger.getDay()] : [],
            }
          : {}),
        payload: { type: "CUSTOM" },
      });
      setReminderTitle("");
      setReminderBody("");
      setReminderTriggerAt("");
      setReminderRepeatType("");
      toast.success("¡Recordatorio creado!");
      onClose();
    } catch {
      toast.error("Ups, no pudimos crear el recordatorio. Inténtalo de nuevo.");
    }
  };

  const convertToTask = (note: QuickNote, date: DetectedDate | null) => {
    const prefill = encodeURIComponent(JSON.stringify({ title: note.content, dueDate: date?.isoDate ?? "" }));
    onClose();
    router.push(`/tasks?modal=create&prefill=${prefill}&quickNoteId=${encodeURIComponent(note.id)}`);
  };

  const openFullTaskEditor = () => {
    const prefill = encodeURIComponent(JSON.stringify({
      title: taskTitle.trim(),
      description: taskDescription,
      dueDate: taskDueDate,
      priority: taskPriority,
      pomodoroEstimate,
      projectId: effectiveProjectId,
    }));
    onClose();
    router.push(`/tasks?modal=create&prefill=${prefill}`);
  };

  const busy = taskMutations.create.isPending || noteMutations.create.isPending || reminderMutations.create.isPending;

  return (
    <div className="flex min-h-0 flex-col">
      <div className="border-b border-outline-variant bg-surface-container-low px-4 py-3 sm:px-5">
        <div className="grid grid-cols-3 gap-1 rounded-xl border border-outline-variant bg-surface-bright p-1" role="tablist" aria-label="Tipo de captura">
          {modes.map((item) => {
            const active = mode === item.value;
            const Icon = item.icon;
            return (
              <button
                aria-selected={active}
                className={`flex min-h-10 items-center justify-center gap-1.5 rounded-lg px-2 font-label-md text-label-md transition-colors ${active ? "bg-primary text-on-primary shadow-cadence-1" : "text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface"}`}
                key={item.value}
                onClick={() => setMode(item.value)}
                role="tab"
                type="button"
              >
                <Icon aria-hidden="true" size={15} />
                {item.label}
              </button>
            );
          })}
        </div>
        <p className="mt-2 px-1 font-body-sm text-body-sm text-on-surface-variant">
          {mode === "TASK" ? "Saca la próxima acción de tu cabeza." : mode === "NOTE" ? "Guárdalo ahora y revísalo cuando tengas espacio." : "Elige cuándo quieres que Nisky te lo recuerde."}
        </p>
      </div>

      {mode === "TASK" && (
        <form className="flex flex-col gap-4 p-4 sm:p-5" onSubmit={(event) => { event.preventDefault(); void saveTask(); }}>
          <label className="block">
            <FieldLabel>TÍTULO DE LA TAREA</FieldLabel>
            <input autoFocus className="field mt-1.5" onChange={(event) => setTaskTitle(event.target.value)} placeholder="Ej: preparar la presentación" value={taskTitle} />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <FieldLabel>PARA CUÁNDO</FieldLabel>
              <input className="field mt-1.5" onChange={(event) => setTaskDueDate(event.target.value)} type="datetime-local" value={taskDueDate} />
            </label>
            <label className="block">
              <FieldLabel>PROYECTO</FieldLabel>
              <select className="field mt-1.5" onChange={(event) => setTaskProjectId(event.target.value)} value={effectiveProjectId}>
                <option value="">Sin proyecto</option>
                {(projectsQuery.data ?? []).map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
              </select>
            </label>
          </div>
          <label className="block">
            <FieldLabel>PRIORIDAD</FieldLabel>
            <select className="field mt-1.5" onChange={(event) => setTaskPriority(event.target.value as TaskPriority)} value={taskPriority}>
              <option value="URGENT">Urgente</option>
              <option value="HIGH">Alta</option>
              <option value="NORMAL">Normal</option>
              <option value="LOW">Baja</option>
            </select>
          </label>
          <button className="flex min-h-11 items-center gap-2 self-start rounded-lg px-2 font-label-md text-label-md text-secondary hover:bg-secondary-container" onClick={() => setTaskAdvancedOpen((value) => !value)} type="button">
            <ChevronDown className={taskAdvancedOpen ? "rotate-180 transition-transform" : "transition-transform"} size={15} />
            {taskAdvancedOpen ? "Ocultar detalles" : "Añadir detalles"}
          </button>
          {taskAdvancedOpen && (
            <div className="grid gap-4 rounded-xl border border-outline-variant bg-surface-container-low p-3 sm:grid-cols-[1fr_9rem]">
              <label className="block sm:col-span-2">
                <FieldLabel>DESCRIPCIÓN</FieldLabel>
                <textarea className="field mt-1.5 h-auto min-h-24 resize-y py-3" onChange={(event) => setTaskDescription(event.target.value)} placeholder="Añade contexto, enlaces o el resultado esperado" value={taskDescription} />
              </label>
              <label className="block">
                <FieldLabel>POMODOROS</FieldLabel>
                <input className="field mt-1.5" min={0} onChange={(event) => setPomodoroEstimate(Number(event.target.value) || 0)} type="number" value={pomodoroEstimate} />
              </label>
              <div className="flex items-end">
                <Button className="w-full" onClick={openFullTaskEditor} type="button" variant="outline">Editor completo</Button>
              </div>
            </div>
          )}
          <div className="mt-1 flex items-center justify-between gap-3 border-t border-outline-variant pt-4">
            <span className="font-body-sm text-body-sm text-on-surface-variant">Enter para crear</span>
            <Button disabled={busy || !taskTitle.trim()} type="submit"><Plus size={16} /> Crear tarea</Button>
          </div>
        </form>
      )}

      {mode === "NOTE" && (
        <div className="flex min-h-0 flex-col gap-4 p-4 sm:p-5">
          <textarea aria-label="Nota rápida" className="field h-auto min-h-36 resize-none rounded-2xl bg-surface-container-low p-4 text-base leading-7" onChange={(event) => setNoteDraft(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) { event.preventDefault(); void saveNote(); } }} placeholder="Escribe algo para revisarlo después..." value={noteDraft} />
          <div className="flex min-h-5 items-center justify-between gap-3">
            {detected ? <span className="inline-flex items-center gap-1 font-data-mono text-data-mono text-xs text-tertiary"><CalendarClock size={12} /> Fecha detectada: {detected.label}</span> : <span className="font-data-mono text-data-mono text-xs text-on-surface-variant">{noteDraft.length} caracteres</span>}
            <span className="font-body-sm text-body-sm text-on-surface-variant">Ctrl/Cmd + Enter</span>
          </div>
          <div className="flex items-center justify-between gap-3 border-t border-outline-variant pt-4">
            <button className="font-label-md text-label-md text-secondary hover:underline" onClick={() => setNoteManagerOpen(true)} type="button">Ver archivadas</button>
            <Button disabled={busy || !noteDraft.trim()} onClick={() => void saveNote()} type="button"><StickyNote size={16} /> Guardar nota</Button>
          </div>
          {noteQuery.isError && <p className="font-body-sm text-body-sm text-error">Ups, no pudimos cargar tus notas.</p>}
          {notes.length > 0 && (
            <section className="border-t border-outline-variant pt-4">
              <div className="mb-2 flex items-center justify-between gap-3">
                <div>
                  <p className="font-label-caps text-label-caps text-on-surface-variant">BANDEJA DE ENTRADA</p>
                  <p className="mt-0.5 font-body-sm text-body-sm text-on-surface-variant">{notes.length} {notes.length === 1 ? "nota pendiente" : "notas pendientes"}</p>
                </div>
                {notes.length > 8 && <button className="font-label-caps text-label-caps text-secondary hover:underline" onClick={() => setAllNotesOpen(true)} type="button">VER TODAS</button>}
              </div>
              <div className="divide-y divide-outline-variant rounded-xl border border-outline-variant px-3">
                {notes.slice(0, 8).map((note) => <QuickNoteItem key={note.id} note={note} onConvertToTask={convertToTask} />)}
              </div>
            </section>
          )}
          {allNotesOpen && <QuickNoteManager onClose={() => setAllNotesOpen(false)} onConvertToTask={convertToTask} view="inbox" />}
          {noteManagerOpen && <QuickNoteManager onClose={() => setNoteManagerOpen(false)} />}
        </div>
      )}

      {mode === "REMINDER" && (
        <form className="flex flex-col gap-4 p-4 sm:p-5" onSubmit={(event) => { event.preventDefault(); void saveReminder(); }}>
          <label className="block">
            <FieldLabel>QUÉ RECORDAR</FieldLabel>
            <input autoFocus className="field mt-1.5" onChange={(event) => setReminderTitle(event.target.value)} placeholder="Ej: llamar al médico" value={reminderTitle} />
          </label>
          <label className="block">
            <FieldLabel>DETALLE (OPCIONAL)</FieldLabel>
            <textarea className="field h-auto min-h-20 resize-y py-3" onChange={(event) => setReminderBody(event.target.value)} placeholder="Añade un poco de contexto" value={reminderBody} />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <FieldLabel>CUÁNDO</FieldLabel>
              <input className="field mt-1.5" onChange={(event) => setReminderTriggerAt(event.target.value)} type="datetime-local" value={reminderTriggerAt} />
            </label>
            <label className="block">
              <FieldLabel>REPETIR</FieldLabel>
              <select className="field mt-1.5" onChange={(event) => setReminderRepeatType(event.target.value as typeof reminderRepeatType)} value={reminderRepeatType}>
                <option value="">No repetir</option>
                <option value="DAILY">Cada día</option>
                <option value="WEEKLY">Cada semana</option>
                <option value="MONTHLY">Cada mes</option>
              </select>
            </label>
          </div>
          <div className="flex items-center justify-between gap-3 border-t border-outline-variant pt-4">
            <span className="inline-flex items-center gap-1.5 font-body-sm text-body-sm text-on-surface-variant"><FileText size={15} /> Se guardará en tu zona horaria</span>
            <Button disabled={busy} type="submit"><AlarmClock size={16} /> Guardar aviso</Button>
          </div>
        </form>
      )}
    </div>
  );
}
