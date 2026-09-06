"use client";

import { ChevronLeft, ChevronRight, Plus, SlidersHorizontal, X } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useProjectsQuery } from "@/features/projects/hooks/useProjects";
import { TimeBlockEditor } from "@/features/timeblocks/components/TimeBlockEditor";
import { TimeBlockWeekGrid } from "@/features/timeblocks/components/TimeBlockWeekGrid";
import { TaskAssignmentPanel } from "@/features/timeblocks/components/TaskAssignmentPanel";
import { AgendaEntryChooser, type AgendaEntryKind } from "@/features/timeblocks/components/AgendaEntryChooser";
import { AgendaDayTasksDialog } from "@/features/timeblocks/components/AgendaDayTasksDialog";
import { EventEditorModal } from "@/features/events/components/EventEditorModal";
import { useTaskSchedulesQuery } from "@/features/task-schedules/hooks/useTaskSchedules";
import {
  useTimeBlockMutations,
  useTimeBlockSettingsMutation,
  useTimeBlockSettingsQuery,
  useTimeBlocksQuery,
  useWeekExceptionsQuery,
} from "@/features/timeblocks/hooks/useTimeBlocks";
import { useEventsQuery, useEventMutations } from "@/features/events/hooks/useEvents";
import { minToTime, parseDateOnly, timeToMin } from "@/features/timeblocks/lib/time";
import type { CreateTimeBlockPayload } from "@/features/timeblocks/api/timeblocks";
import { useIsMobile } from "@/hooks/useIsMobile";
import type { CalendarEvent, TimeBlock } from "@/types/entities";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";

type SlotPrefill = { dayOfWeek: number; startMin: number; endMin: number; date: string; oneOff?: boolean };
type EventEditorState = {
  event: CalendarEvent | null;
  initialDate?: string;
  initialStartMin?: number;
  initialEndMin?: number;
};

function toISODateString(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function EventMoveModal({
  title,
  startTime,
  endTime,
  busy,
  onChangeStart,
  onChangeEnd,
  onCancel,
  onSave,
}: {
  title: string;
  startTime: string;
  endTime: string;
  busy: boolean;
  onChangeStart: (value: string) => void;
  onChangeEnd: (value: string) => void;
  onCancel: () => void;
  onSave: () => void;
}) {
  return (
    <Dialog open onOpenChange={(nextOpen) => { if (!nextOpen) onCancel(); }}>
      <DialogContent className="max-w-md rounded-lg border-outline-variant bg-surface shadow-cadence-3" showCloseButton={false}>
        <DialogHeader className="text-left">
          <DialogTitle className="font-headline-xs text-headline-xs normal-case tracking-normal">Mover «{title}» solo hoy</DialogTitle>
          <DialogDescription className="font-body-md text-body-md text-on-surface-variant">
          Este cambio solo aplica a la ocurrencia del día seleccionado.
          </DialogDescription>
        </DialogHeader>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <label className="block">
            <span className="font-label-md text-label-md text-on-surface-variant">Inicio</span>
            <input
              className="field mt-1"
              onChange={(e) => onChangeStart(e.target.value)}
              type="time"
              value={startTime}
            />
          </label>
          <label className="block">
            <span className="font-label-md text-label-md text-on-surface-variant">Fin</span>
            <input
              className="field mt-1"
              onChange={(e) => onChangeEnd(e.target.value)}
              type="time"
              value={endTime}
            />
          </label>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <DialogClose asChild>
            <button className="min-h-11 rounded-md border border-outline-variant bg-surface px-4 py-2 font-body-md text-body-md text-on-surface-variant transition-colors hover:bg-surface-container-low disabled:opacity-50" disabled={busy} type="button">Cancelar</button>
          </DialogClose>
          <button
            className="min-h-11 rounded-md bg-primary px-4 py-2 font-body-md text-body-md text-on-primary transition-colors hover:bg-primary/90 disabled:opacity-50"
            disabled={busy}
            onClick={onSave}
            type="button"
          >
            Guardar
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ResizeResolveModal({
  date,
  onException,
  onOriginal,
  onCancel,
  busy,
}: {
  date: string;
  onException: () => void;
  onOriginal: () => void;
  onCancel: () => void;
  busy: boolean;
}) {
  return (
    <Dialog open onOpenChange={(nextOpen) => { if (!nextOpen) onCancel(); }}>
      <DialogContent className="max-w-md rounded-lg border-outline-variant bg-surface shadow-cadence-3" showCloseButton={false}>
        <DialogHeader className="text-left">
          <DialogTitle className="font-headline-xs text-headline-xs normal-case tracking-normal">¿Aplicar cambio a un solo día?</DialogTitle>
          <DialogDescription className="font-body-md text-body-md text-on-surface-variant">
          Este bloque se repite varios días. Puedes moverlo solo el {date} o cambiar el horario original para siempre.
          </DialogDescription>
        </DialogHeader>
        <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
          <DialogClose asChild>
            <button className="min-h-11 rounded-md border border-outline-variant bg-surface px-4 py-2 font-body-md text-body-md text-on-surface-variant transition-colors hover:bg-surface-container-low disabled:opacity-50" disabled={busy} type="button">Cancelar</button>
          </DialogClose>
          <button
            className="min-h-11 rounded-md border border-secondary px-4 py-2 font-body-md text-body-md text-secondary transition-colors hover:bg-secondary-container disabled:opacity-50"
            disabled={busy}
            onClick={onOriginal}
            type="button"
          >
            Cambiar original
          </button>
          <button
            className="min-h-11 rounded-md bg-primary px-4 py-2 font-body-md text-body-md text-on-primary transition-colors hover:bg-primary/90 disabled:opacity-50"
            disabled={busy}
            onClick={onException}
            type="button"
          >
            Solo este día
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function MobileEditorModal({
  children,
  title,
  onClose,
}: {
  children: React.ReactNode;
  title: string;
  onClose: () => void;
}) {
  return (
    <Drawer fixed open onOpenChange={(nextOpen) => { if (!nextOpen) onClose(); }} repositionInputs>
       <DrawerContent className="flex h-[min(85dvh,42rem)] min-h-0 max-h-[85dvh] overflow-hidden rounded-t-lg border-outline-variant bg-surface pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] shadow-cadence-3 lg:hidden">
        <DrawerHeader className="flex shrink-0 flex-row items-center justify-between border-b border-outline-variant bg-surface px-5 py-4 text-left">
          <div>
            <DrawerTitle className="font-headline-xs text-headline-xs font-bold normal-case tracking-normal text-primary">{title}</DrawerTitle>
            <DrawerDescription className="sr-only">Editor de bloque de tiempo.</DrawerDescription>
          </div>
          <DrawerClose asChild>
            <button aria-label="Cerrar" className="flex h-11 w-11 items-center justify-center rounded-full text-on-surface-variant transition-colors hover:bg-surface-container-low hover:text-on-surface" type="button">
              <X size={19} />
            </button>
          </DrawerClose>
        </DrawerHeader>
        <div className="min-h-0 flex-1 overflow-y-auto p-5" data-modal-scroll>
          {children}
        </div>
      </DrawerContent>
    </Drawer>
  );
}

function DesktopEditorModal({
  children,
  title,
  onClose,
}: {
  children: React.ReactNode;
  title: string;
  onClose: () => void;
}) {
  return (
    <Dialog open onOpenChange={(nextOpen) => { if (!nextOpen) onClose(); }}>
      <DialogContent className="flex max-h-[90vh] max-w-md flex-col gap-0 overflow-hidden rounded-lg border-outline-variant bg-surface p-0 shadow-cadence-3" showCloseButton={false}>
        <DialogHeader className="flex shrink-0 flex-row items-center justify-between border-b border-outline-variant bg-surface-bright px-5 py-4 text-left">
          <div>
            <DialogTitle className="font-headline-xs text-headline-xs font-bold normal-case tracking-normal text-primary">{title}</DialogTitle>
            <DialogDescription className="sr-only">Editor de bloque de tiempo.</DialogDescription>
          </div>
          <DialogClose asChild>
            <button aria-label="Cerrar" className="flex h-11 w-11 items-center justify-center rounded-full text-on-surface-variant transition-colors hover:bg-surface-container-low hover:text-on-surface" type="button">
              <X size={19} />
            </button>
          </DialogClose>
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-y-auto p-5" data-modal-scroll>
          {children}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function TimeBlocksContent() {
  const query = useTimeBlocksQuery();
  const mutations = useTimeBlockMutations();
  const projectsQuery = useProjectsQuery();
  const projects = projectsQuery.data ?? [];
  const settingsQuery = useTimeBlockSettingsQuery();
  const settingsMutation = useTimeBlockSettingsMutation();
  const settings = settingsQuery.data;
  const isMobile = useIsMobile(1023);
  const blocks = query.data ?? [];
  const [editing, setEditing] = useState<TimeBlock | null>(null);
  const [editDate, setEditDate] = useState<string | null>(null);
  const [prefill, setPrefill] = useState<SlotPrefill | null>(null);
  const [entryChooserOpen, setEntryChooserOpen] = useState(false);
  const [entrySlot, setEntrySlot] = useState<SlotPrefill | null>(null);
  const [eventEditor, setEventEditor] = useState<EventEditorState | null>(null);
  const [formKey, setFormKey] = useState(0);
  const [mobileFormOpen, setMobileFormOpen] = useState(false);
  const [dayTaskDate, setDayTaskDate] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [resolveDraft, setResolveDraft] = useState<{
    block: TimeBlock;
    startMin: number;
    endMin: number;
    days: number[];
    draggedDate: string;
  } | null>(null);
  const [dayStartTime, setDayStartTime] = useState("06:00");
  const [dayEndTime, setDayEndTime] = useState("23:00");
  const settingsBusy = settingsMutation.isPending;

  const now = new Date();
  const [weekOffset, setWeekOffset] = useState(0);
  const anchor = new Date(now);
  anchor.setDate(anchor.getDate() + weekOffset * 7);
  const weekStart = new Date(anchor);
  weekStart.setHours(0, 0, 0, 0);
  const day = weekStart.getDay();
  weekStart.setDate(weekStart.getDate() - (day === 0 ? 6 : day - 1));
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  
  const from = `${weekStart.getFullYear()}-${String(weekStart.getMonth() + 1).padStart(2, "0")}-${String(weekStart.getDate()).padStart(2, "0")}`;
  const to = `${weekEnd.getFullYear()}-${String(weekEnd.getMonth() + 1).padStart(2, "0")}-${String(weekEnd.getDate()).padStart(2, "0")}`;
  
  const eventsQuery = useEventsQuery(from, to);
  const events = eventsQuery.data ?? [];
  const eventMutations = useEventMutations();
  const [eventMoveDraft, setEventMoveDraft] = useState<{ event: CalendarEvent; date: Date } | null>(null);
  const [eventMoveStart, setEventMoveStart] = useState("09:00");
  const [eventMoveEnd, setEventMoveEnd] = useState("10:00");
  const exceptionsQuery = useWeekExceptionsQuery(from, to);
  const exceptions = exceptionsQuery.data ?? [];
  const schedulesQuery = useTaskSchedulesQuery({ from, to });
  const taskSchedules = useMemo(
    () => (schedulesQuery.data ?? []).filter((schedule) => schedule.occurrence?.occurs !== false),
    [schedulesQuery.data],
  );
  const taskCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const schedule of taskSchedules) {
      if (!schedule.timeBlockId) continue;
      const key = `${schedule.timeBlockId}:${schedule.date.slice(0, 10)}`;
      counts[key] = (counts[key] ?? 0) + 1;
    }
    return counts;
  }, [taskSchedules]);
  const dayTaskSchedules = useMemo(
    () => dayTaskDate ? taskSchedules.filter((schedule) => schedule.date.slice(0, 10) === dayTaskDate) : [],
    [dayTaskDate, taskSchedules],
  );

  const openSettings = () => {
    setDayStartTime(minToTime(settings?.dayStartMin ?? 6 * 60));
    setDayEndTime(minToTime(settings?.dayEndMin ?? 23 * 60));
    setSettingsOpen((open) => !open);
  };

  const saveDayRange = async () => {
    const dayStartMin = timeToMin(dayStartTime);
    const dayEndMin = timeToMin(dayEndTime);
    if (dayEndMin <= dayStartMin) {
      toast.error("El fin del día debe ser mayor al inicio.");
      return;
    }
    try {
      await settingsMutation.mutateAsync({ dayStartMin, dayEndMin });
      toast.success("Rango del día actualizado");
      setSettingsOpen(false);
    } catch {
      toast.error("Ups, no pudimos actualizar el rango del día.");
    }
  };

  const busy =
    mutations.create.isPending ||
    mutations.update.isPending ||
    mutations.remove.isPending;

  const defaultAgendaSlot = (): SlotPrefill => {
    const now = new Date();
    const currentMin = now.getHours() * 60 + now.getMinutes();
    const startMin = Math.min(Math.max(Math.ceil(currentMin / 15) * 15, 9 * 60), 22 * 60);
    return {
      dayOfWeek: now.getDay(),
      startMin,
      endMin: startMin + 60,
      date: toISODateString(now),
    };
  };

  const openEntryChooser = (slot?: SlotPrefill) => {
    setEntrySlot(slot ?? defaultAgendaSlot());
    setEntryChooserOpen(true);
  };

  const selectAgendaEntry = (kind: AgendaEntryKind) => {
    const slot = entrySlot ?? defaultAgendaSlot();
    setEntryChooserOpen(false);
    if (kind === "event") {
      setEventEditor({
        event: null,
        initialDate: slot.date,
        initialStartMin: slot.startMin,
        initialEndMin: slot.endMin,
      });
      return;
    }
    setEditing(null);
    setEditDate(null);
    setPrefill({ ...slot, oneOff: true });
    setMobileFormOpen(isMobile);
  };

  const openBlock = (block: TimeBlock, date?: Date) => {
    setEditing(block);
    setPrefill(null);
    setEditDate(date ? toISODateString(date) : null);
    if (isMobile) setMobileFormOpen(true);
  };

  const resizeBlock = async (block: TimeBlock, startMin: number, endMin: number, days: number[], draggedDate?: string) => {
    const daysChanged =
      days.length !== block.daysOfWeek.length ||
      days.some((day, index) => day !== block.daysOfWeek[index]);

    const hasMoveException =
      !!draggedDate &&
      exceptions.some((exc) => {
        if (exc.blockId !== block.id || exc.action !== "move") return false;
        const d = parseDateOnly(exc.date);
        const dayKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
        return dayKey === draggedDate;
      });

    if (!daysChanged && hasMoveException) {
      try {
        await mutations.createException.mutateAsync({
          id: block.id,
          date: draggedDate,
          action: "move",
          startMin,
          endMin,
        });
        toast.success("Excepción actualizada para este día");
      } catch (err) {
        toast.error((err as { message?: string })?.message ?? "Ups, no pudimos actualizar la excepción.");
      }
      return;
    }

    if (startMin === block.startMin && endMin === block.endMin && !daysChanged) return;

    if (!daysChanged && draggedDate && (block.daysOfWeek.length > 1 || block.repeatEveryWeeks > 1)) {
      setResolveDraft({ block, startMin, endMin, days, draggedDate });
      return;
    }

    try {
      await mutations.update.mutateAsync({
        id: block.id,
        payload: { startMin, endMin, daysOfWeek: days },
      });
      toast.success("Bloque actualizado en la Agenda");
    } catch {
      toast.error("Ups, no pudimos ajustar el bloque. Inténtalo de nuevo.");
    }
  };

  const resolveAsException = async () => {
    if (!resolveDraft) return;
    const { block, startMin, endMin, draggedDate } = resolveDraft;
    try {
      await mutations.createException.mutateAsync({
        id: block.id,
        date: draggedDate,
        action: "move",
        startMin,
        endMin,
      });
      toast.success("Excepción guardada para este día");
      setEditing(null);
      setPrefill(null);
      setEditDate(null);
      setMobileFormOpen(false);
      setResolveDraft(null);
    } catch (err) {
      toast.error((err as { message?: string })?.message ?? "Ups, no pudimos crear la excepción.");
    }
  };

  const resolveAsOriginal = async () => {
    if (!resolveDraft) return;
    const { block, startMin, endMin, days } = resolveDraft;
    try {
      await mutations.update.mutateAsync({
        id: block.id,
        payload: { startMin, endMin, daysOfWeek: days },
      });
      toast.success("Horario actualizado para todos los días");
    } catch {
      toast.error("Ups, no pudimos ajustar el bloque. Inténtalo de nuevo.");
    }
    setResolveDraft(null);
  };

  const closeEditor = () => {
    setEditing(null);
    setPrefill(null);
    setMobileFormOpen(false);
  };

  const openEvent = (event: CalendarEvent, date: Date) => {
    setEventEditor({ event, initialDate: toISODateString(date) });
  };

  const save = async (data: CreateTimeBlockPayload) => {
    try {
      if (editing) {
        const daysChanged =
          data.daysOfWeek.length !== editing.daysOfWeek.length ||
          data.daysOfWeek.some((day, index) => day !== editing.daysOfWeek[index]);
        const timeChanged =
          data.startMin !== editing.startMin || data.endMin !== editing.endMin;
        const repeats = editing.daysOfWeek.length > 1 || editing.repeatEveryWeeks > 1;
        if (!daysChanged && timeChanged && repeats && editDate) {
          setResolveDraft({
            block: editing,
            startMin: data.startMin,
            endMin: data.endMin,
            days: data.daysOfWeek,
            draggedDate: editDate,
          });
          return;
        }
        await mutations.update.mutateAsync({ id: editing.id, payload: data });
        setEditing({ ...editing, ...data, daysOfWeek: data.daysOfWeek });
        setEditDate(null);
        toast.success("¡Listo, bloque actualizado!");
        return;
      }
      await mutations.create.mutateAsync(data);
      setPrefill(null);
      setFormKey((key) => key + 1);
      toast.success("¡Bloque creado!");
      setMobileFormOpen(false);
    } catch {
      toast.error("Ups, no pudimos guardar el bloque. Inténtalo de nuevo.");
    }
  };

  const toggleActive = async () => {
    if (!editing) return;
    try {
      await mutations.update.mutateAsync({
        id: editing.id,
        payload: { isActive: !editing.isActive },
      });
      setEditing({ ...editing, isActive: !editing.isActive });
    } catch {
      toast.error("Ups, no pudimos actualizar el bloque.");
    }
  };

  const remove = async () => {
    if (!editing) return;
    try {
      await mutations.remove.mutateAsync(editing.id);
      closeEditor();
      toast.success("Bloque eliminado");
    } catch {
      toast.error("Ups, no pudimos eliminar el bloque. Inténtalo de nuevo.");
    }
  };

  const skipToday = async (date?: string) => {
    if (!editing) return;
    const dateStr = date ?? (() => {
      const now = new Date();
      return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    })();
    try {
      await mutations.createException.mutateAsync({
        id: editing.id,
        date: dateStr,
        action: "skip",
      });
      toast.success("Bloque saltado ese día");
    } catch (err) {
      toast.error((err as { message?: string })?.message ?? "Ups, no pudimos saltar el bloque.");
    }
  };

  const handleEventAction = (event: CalendarEvent, date: Date, action: "skip" | "move") => {
    const dateStr = toISODateString(date);
    if (action === "skip") {
      eventMutations.createException
        .mutateAsync({ eventId: event.id, payload: { date: dateStr, action: "skip" } })
        .then(() => toast.success("Evento saltado ese día"))
        .catch((err) =>
          toast.error((err as { message?: string })?.message ?? "Ups, no pudimos saltar el evento."),
        );
      return;
    }
    setEventMoveStart(minToTime(event.startMin ?? 9 * 60));
    setEventMoveEnd(minToTime(event.endMin ?? 10 * 60));
    setEventMoveDraft({ event, date });
  };

  const handleEventMove = async (
    event: CalendarEvent,
    sourceDate: Date,
    targetDate: Date,
    startMin: number,
    endMin: number,
  ) => {
    if (event.recurrenceType) {
      setEventMoveStart(minToTime(startMin));
      setEventMoveEnd(minToTime(endMin));
      setEventMoveDraft({ event, date: sourceDate });
      return;
    }

    try {
      await eventMutations.updateEvent.mutateAsync({
        id: event.id,
        payload: {
          date: toISODateString(targetDate),
          startMin,
          endMin,
        },
      });
      toast.success("Evento movido");
    } catch (err) {
      toast.error((err as { message?: string })?.message ?? "Ups, no pudimos mover el evento.");
    }
  };

  const saveEventMove = async () => {
    if (!eventMoveDraft) return;
    const startMin = timeToMin(eventMoveStart);
    const endMin = timeToMin(eventMoveEnd);
    if (endMin <= startMin) {
      toast.error("El fin debe ser mayor al inicio.");
      return;
    }
    try {
      await eventMutations.createException.mutateAsync({
        eventId: eventMoveDraft.event.id,
        payload: { date: toISODateString(eventMoveDraft.date), action: "move", startMin, endMin },
      });
      toast.success("Evento movido ese día");
      setEventMoveDraft(null);
    } catch (err) {
      toast.error((err as { message?: string })?.message ?? "Ups, no pudimos mover el evento.");
    }
  };

  const editor = (
    <TimeBlockEditor
      busy={busy}
      key={editing?.id ?? `create-${formKey}-${prefill?.date ?? ""}-${prefill?.dayOfWeek ?? ""}-${prefill?.startMin ?? ""}-${prefill?.endMin ?? ""}`}
      onDelete={remove}
      onSave={save}
      onSkipToday={skipToday}
      initialSkipDate={editDate ?? undefined}
      onToggleActive={toggleActive}
      prefill={prefill ?? undefined}
      projects={projects}
      target={editing}
    />
  );

  return (
    <section className="h-full overflow-y-auto bg-background p-container-padding sm:p-section-gap lg:flex lg:flex-col lg:overflow-hidden">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3 border-b border-outline-variant pb-5">
        <div>
          <p className="font-label-caps text-label-caps uppercase text-on-surface-variant">
             PLANIFICA TU TIEMPO
          </p>
          <h1 className="mt-1 font-headline-md text-headline-md text-on-surface">
            Agenda
          </h1>
          <p className="mt-1 font-body-sm text-body-sm text-on-surface-variant">
             Organiza bloques de trabajo y eventos para saber qué toca y cuándo.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {weekOffset !== 0 && (
            <button
              className="min-h-11 rounded-md px-2.5 font-body-sm text-body-sm text-on-surface-variant transition-colors hover:bg-surface-container-low hover:text-secondary sm:min-h-10"
              onClick={() => setWeekOffset(0)}
              title="Volver a la semana actual"
              type="button"
            >
              Volver a hoy
            </button>
          )}
          <div className="flex items-center overflow-hidden rounded-md border border-outline-variant bg-surface">
            <button
              aria-label="Semana anterior"
              className="flex h-11 w-11 items-center justify-center text-on-surface-variant transition-colors hover:bg-surface-container-low hover:text-secondary sm:h-10 sm:w-10"
              onClick={() => setWeekOffset((offset) => offset - 1)}
              title="Semana anterior"
              type="button"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="flex min-h-11 min-w-[9.5rem] items-center justify-center border-x border-outline-variant px-3 text-center font-data-mono text-data-mono text-xs text-on-surface-variant sm:min-h-10">
              {weekStart.getDate() < weekEnd.getDate()
                ? `${weekStart.getDate()}–${weekEnd.getDate()} ${weekEnd.toLocaleDateString("es", { month: "short" })}`
                : `${weekStart.toLocaleDateString("es", { day: "numeric", month: "short" })} – ${weekEnd.toLocaleDateString("es", { day: "numeric", month: "short" })}`}
            </span>
            <button
              aria-label="Semana siguiente"
              className="flex h-11 w-11 items-center justify-center text-on-surface-variant transition-colors hover:bg-surface-container-low hover:text-secondary sm:h-10 sm:w-10"
              onClick={() => setWeekOffset((offset) => offset + 1)}
              title="Semana siguiente"
              type="button"
            >
              <ChevronRight size={16} />
            </button>
          </div>
          <button
            aria-label={`Configurar horario (${minToTime(settings?.dayStartMin ?? 6 * 60)} – ${minToTime(settings?.dayEndMin ?? 23 * 60)})`}
            className="flex min-h-11 items-center gap-2 rounded-md px-2.5 py-1.5 font-body-sm text-body-sm text-on-surface-variant transition-colors hover:bg-surface-container-low hover:text-secondary"
            onClick={openSettings}
            type="button"
          >
            <SlidersHorizontal size={14} />
            <span>Horario</span>
          </button>
          <button
            className="hidden min-h-11 items-center gap-2 rounded-md bg-primary px-4 py-2 font-body-sm text-body-sm text-on-primary transition-colors hover:bg-primary/90 sm:flex sm:min-h-10"
            onClick={() => openEntryChooser()}
            type="button"
          >
            <Plus size={16} />
            Añadir
          </button>
        </div>
      </div>

      {settingsOpen && (
        <div className="mb-6 rounded-lg border border-outline-variant bg-surface p-5 shadow-cadence-1">
          <p className="font-label-caps text-label-caps uppercase text-on-surface-variant">
            RANGO DEL DÍA
          </p>
          <p className="mt-1 font-body-sm text-body-sm text-on-surface-variant">
            Define las horas visibles en tu horario semanal.
          </p>
          <div className="mt-3 grid max-w-md grid-cols-2 gap-3">
            <label className="block">
              <span className="font-label-md text-label-md text-on-surface-variant">Inicio</span>
              <input
                className="field mt-1"
                onChange={(event) => setDayStartTime(event.target.value)}
                type="time"
                value={dayStartTime}
              />
            </label>
            <label className="block">
              <span className="font-label-md text-label-md text-on-surface-variant">Fin</span>
              <input
                className="field mt-1"
                onChange={(event) => setDayEndTime(event.target.value)}
                type="time"
                value={dayEndTime}
              />
            </label>
          </div>
          <button
            className="mt-3 flex min-h-11 items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 font-body-sm text-body-sm text-on-primary transition-colors hover:bg-primary/90 disabled:opacity-50"
            disabled={settingsBusy}
            onClick={() => void saveDayRange()}
            type="button"
          >
            Guardar rango
          </button>
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-hidden rounded-lg border border-outline-variant bg-surface shadow-cadence-1 lg:overflow-y-auto">
        <TimeBlockWeekGrid
          blocks={blocks}
          events={events}
          exceptions={exceptions}
          dayEndMin={settings?.dayEndMin ?? 23 * 60}
          dayStartMin={settings?.dayStartMin ?? 6 * 60}
          moveEnabled={!isMobile}
          onDayTasksClick={(date) => setDayTaskDate(date)}
           onBlockClick={openBlock}
           onEventClick={openEvent}
           onEventMove={handleEventMove}
           onEventAction={handleEventAction}
          onResize={resizeBlock}
          onSlotClick={(dayOfWeek, startMin, date) => openEntryChooser({
            dayOfWeek,
            startMin,
            endMin: Math.min(startMin + 60, 24 * 60),
            date: toISODateString(date),
          })}
          projects={projects}
          taskCounts={taskCounts}
          taskSchedules={taskSchedules}
          weekStart={weekStart}
        />
      </div>

      <button
        aria-label="Añadir a Agenda"
        className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom,0px))] right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full border border-outline-variant bg-primary text-on-primary shadow-cadence-2 transition-colors hover:bg-primary/90 sm:bottom-6 lg:hidden"
        onClick={() => openEntryChooser()}
        type="button"
      >
        <Plus size={22} />
      </button>

      {!isMobile && (editing || prefill) && (
        <DesktopEditorModal
          onClose={closeEditor}
          title={editing ? "Editar bloque" : "Tiempo para trabajar"}
        >
          {editor}
          {editing && editDate && <TaskAssignmentPanel block={editing} date={editDate} />}
        </DesktopEditorModal>
      )}

      {isMobile && mobileFormOpen && (
        <MobileEditorModal
          onClose={closeEditor}
          title={editing ? "Editar bloque" : "Tiempo para trabajar"}
        >
          {editor}
          {editing && editDate && <TaskAssignmentPanel block={editing} date={editDate} />}
        </MobileEditorModal>
      )}

      {resolveDraft && (
        <ResizeResolveModal
          busy={mutations.createException.isPending || mutations.update.isPending}
          date={resolveDraft.draggedDate}
          onCancel={() => setResolveDraft(null)}
          onException={() => void resolveAsException()}
          onOriginal={() => void resolveAsOriginal()}
         />
       )}

      {entryChooserOpen && (
        <AgendaEntryChooser
          onClose={() => setEntryChooserOpen(false)}
          onSelect={selectAgendaEntry}
        />
      )}

      {dayTaskDate && (
        <AgendaDayTasksDialog
          date={dayTaskDate}
          onClose={() => setDayTaskDate(null)}
          schedules={dayTaskSchedules}
        />
      )}

      {eventEditor && (
        <EventEditorModal
          event={eventEditor.event}
          initialDate={eventEditor.initialDate}
          initialEndMin={eventEditor.initialEndMin}
          initialStartMin={eventEditor.initialStartMin}
          key={eventEditor.event?.id ?? `new-${eventEditor.initialDate ?? ""}`}
          onClose={() => setEventEditor(null)}
        />
      )}

      {eventMoveDraft && (
        <EventMoveModal
          busy={eventMutations.createException.isPending}
          endTime={eventMoveEnd}
          onChangeEnd={setEventMoveEnd}
          onChangeStart={setEventMoveStart}
          onCancel={() => setEventMoveDraft(null)}
          onSave={() => void saveEventMove()}
          startTime={eventMoveStart}
          title={eventMoveDraft.event.title}
        />
      )}
    </section>
  );
}

export default function TimeBlocksPage() {
  return <TimeBlocksContent />;
}
