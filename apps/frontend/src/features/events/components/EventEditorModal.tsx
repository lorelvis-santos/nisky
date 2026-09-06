"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { toast } from "sonner";
import type { CalendarEventPayload } from "@/features/events/api/events";
import { useEventExceptionsQuery, useEventMutations } from "@/features/events/hooks/useEvents";
import type { CalendarEvent, EventRecurrenceType } from "@/types/entities";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { ColorPicker, PROJECT_COLORS } from "@/components/ui/ColorPicker";
import { parseDateOnly } from "@/features/timeblocks/lib/time";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

function toLocalISODate(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatMin(value: number) {
  const hours = Math.floor(value / 60).toString().padStart(2, "0");
  const minutes = (value % 60).toString().padStart(2, "0");
  return `${hours}:${minutes}`;
}

function parseMin(time: string) {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

const REMIND_OPTIONS = [
  { value: 0, label: "Sin aviso previo" },
  { value: 5, label: "5 minutos antes" },
  { value: 30, label: "30 minutos antes" },
  { value: 60, label: "1 hora antes" },
  { value: 1440, label: "1 día antes" },
  { value: 10080, label: "1 semana antes" },
] as const;

const ALL_DAY_REMIND_VALUES: readonly number[] = [0, 1440, 10080];

export function EventEditorModal({
  event,
  initialDate,
  initialStartMin,
  initialEndMin,
  onClose,
}: {
  event: CalendarEvent | null;
  initialDate?: string;
  initialStartMin?: number;
  initialEndMin?: number;
  onClose: () => void;
}) {
  const { createEvent, updateEvent, deleteEvent, deleteException } = useEventMutations();
  const eventDate = event?.baseDate ?? event?.date;
  const eventStartMin = event?.baseStartMin !== undefined ? event.baseStartMin : event?.startMin;
  const eventEndMin = event?.baseEndMin !== undefined ? event.baseEndMin : event?.endMin;
  const [title, setTitle] = useState(event?.title ?? "");
  const [date, setDate] = useState(eventDate ? toLocalISODate(parseDateOnly(eventDate)) : initialDate ?? toLocalISODate(new Date()));
  const [allDay, setAllDay] = useState(event?.allDay ?? false);
  const [startMin, setStartMin] = useState(formatMin(eventStartMin ?? initialStartMin ?? 9 * 60));
  const [endMin, setEndMin] = useState(formatMin(eventEndMin ?? initialEndMin ?? 10 * 60));
  const [location, setLocation] = useState(event?.location ?? "");
  const [color, setColor] = useState(event?.color ?? PROJECT_COLORS[0] ?? "#303e51");
  const [recurrenceType, setRecurrenceType] = useState<EventRecurrenceType | null>(event?.recurrenceType ?? null);
  const [recurrenceInterval, setRecurrenceInterval] = useState(event?.recurrenceInterval ?? 1);
  const [recurrenceDaysOfWeek, setRecurrenceDaysOfWeek] = useState<number[]>(event?.recurrenceDaysOfWeek ?? []);
  const [recurrenceDayOfMonth, setRecurrenceDayOfMonth] = useState<number | null>(event?.recurrenceDayOfMonth ?? null);
  const [recurrenceEndsAt, setRecurrenceEndsAt] = useState(
    event?.recurrenceEndsAt ? event.recurrenceEndsAt.slice(0, 10) : "",
  );
  const [remindBeforeMin, setRemindBeforeMin] = useState(event?.remindBeforeMin ?? 0);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  const { data: exceptions = [] } = useEventExceptionsQuery(event?.id ?? "");

  const selectRecurrenceType = (value: EventRecurrenceType | null) => {
    setRecurrenceType(value);
    if (value === "MONTHLY" && recurrenceDayOfMonth === null) {
      setRecurrenceDayOfMonth(new Date(`${date}T00:00:00`).getDate());
    }
  };

  const toggleWeekday = (day: number) => {
    setRecurrenceDaysOfWeek((days) =>
      days.includes(day) ? days.filter((d) => d !== day) : [...days, day],
    );
  };

  const handleRemoveException = async (exceptionId: string) => {
    if (!event) return;
    try {
      await deleteException.mutateAsync({ eventId: event.id, exceptionId });
      toast.success("Excepción eliminada");
    } catch {
      toast.error("Error al eliminar la excepción");
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return toast.error("El título es requerido");
    if (!allDay && parseMin(endMin) <= parseMin(startMin)) {
      return toast.error("La hora final debe ser posterior a la inicial");
    }
    if (recurrenceType === "WEEKLY" && recurrenceDaysOfWeek.length === 0) {
      return toast.error("Elige al menos un día para la recurrencia semanal");
    }
    if (recurrenceType === "MONTHLY" && (recurrenceDayOfMonth === null || recurrenceDayOfMonth < 1)) {
      return toast.error("Indica el día del mes para la recurrencia mensual");
    }

    const payload: CalendarEventPayload = {
      title: title.trim(),
      date,
      allDay,
      startMin: allDay ? undefined : parseMin(startMin),
      endMin: allDay ? undefined : parseMin(endMin),
      location: location.trim() || undefined,
      color,
      recurrenceType: recurrenceType ?? null,
      recurrenceInterval,
      recurrenceDaysOfWeek: recurrenceType === "WEEKLY" ? recurrenceDaysOfWeek : [],
      recurrenceDayOfMonth: recurrenceType === "MONTHLY" ? recurrenceDayOfMonth : null,
      recurrenceEndsAt: recurrenceEndsAt ? `${recurrenceEndsAt}T00:00:00` : null,
      remindBeforeMin,
    };

    try {
      if (event) {
        await updateEvent.mutateAsync({ id: event.id, payload });
        toast.success("Evento actualizado");
      } else {
        await createEvent.mutateAsync(payload);
        toast.success("Evento creado");
      }
      onClose();
    } catch (err) {
      toast.error((err as { message?: string })?.message ?? "Error al guardar el evento");
    }
  };

  const handleDelete = async () => {
    if (!event) return;
    try {
      await deleteEvent.mutateAsync(event.id);
      toast.success("Evento eliminado");
      onClose();
    } catch {
      toast.error("Error al eliminar");
    }
  };

  const saving = createEvent.isPending || updateEvent.isPending;

  return (
    <Dialog open onOpenChange={(nextOpen) => { if (!nextOpen) onClose(); }}>
      <DialogContent className="top-auto bottom-0 flex h-[min(90dvh,48rem)] max-h-[90dvh] w-full max-w-md translate-y-0 flex-col gap-0 overflow-hidden rounded-t-lg rounded-b-none border-outline-variant bg-surface p-0 shadow-cadence-3 sm:top-1/2 sm:bottom-auto sm:h-auto sm:max-h-[90vh] sm:-translate-y-1/2 sm:rounded-lg" data-keyboard-sheet showCloseButton={false}>
        <DialogHeader className="flex shrink-0 flex-row items-center justify-between border-b border-outline-variant bg-surface px-5 py-4 text-left">
          <div>
            <DialogTitle className="flex items-center gap-2 font-headline-xs text-headline-xs font-bold normal-case tracking-normal text-primary">
              {event ? "Editar evento" : "Nuevo evento"}
            </DialogTitle>
            <DialogDescription className="sr-only">Crea o edita un evento del calendario.</DialogDescription>
          </div>
          <DialogClose asChild>
            <button aria-label="Cerrar" className="flex h-11 w-11 items-center justify-center rounded-full text-on-surface-variant transition-colors hover:bg-surface-container-low hover:text-on-surface" type="button">
              <X size={19} />
            </button>
          </DialogClose>
        </DialogHeader>
        {event?.recurrenceType && (
          <p className="flex shrink-0 items-center gap-1.5 bg-secondary-fixed/50 px-5 py-2 font-body-sm text-body-sm text-secondary">
            Este cambio se aplicará a toda la serie.
          </p>
        )}
        <form onSubmit={handleSave} className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5" data-modal-scroll>
          <label className="block">
            <span className="font-label-md text-label-md text-on-surface-variant">Título</span>
            <input
              autoFocus
              className="field mt-1"
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ej. Reunión de equipo"
              value={title}
            />
          </label>
          <label className="block">
            <span className="font-label-md text-label-md text-on-surface-variant">Fecha</span>
            <input
              className="field mt-1"
              onChange={(e) => setDate(e.target.value)}
              type="date"
              value={date}
            />
          </label>
          <div className="flex items-center gap-2">
            <input
              checked={allDay}
              className="size-5 accent-tertiary"
              id="allDay"
              onChange={(e) => {
                const checked = e.target.checked;
                setAllDay(checked);
                if (checked && !ALL_DAY_REMIND_VALUES.includes(remindBeforeMin)) {
                  setRemindBeforeMin(0);
                }
              }}
              type="checkbox"
            />
            <label className="font-body-sm text-body-sm text-on-surface" htmlFor="allDay">Todo el día</label>
          </div>
          {!allDay && (
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="font-label-md text-label-md text-on-surface-variant">Inicio</span>
                <input
                  className="field mt-1"
                  onChange={(e) => setStartMin(e.target.value)}
                  type="time"
                  value={startMin}
                />
              </label>
              <label className="block">
                <span className="font-label-md text-label-md text-on-surface-variant">Fin</span>
                <input
                  className="field mt-1"
                  onChange={(e) => setEndMin(e.target.value)}
                  type="time"
                  value={endMin}
                />
              </label>
            </div>
          )}
          <label className="block">
            <span className="font-label-md text-label-md text-on-surface-variant">Ubicación (opcional)</span>
            <input
              className="field mt-1"
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Ej. Sala A o enlace de Meet"
              value={location}
            />
          </label>
          <div className="block">
            <span className="font-label-md text-label-md text-on-surface-variant">Color</span>
            <div className="mt-2">
              <ColorPicker onChange={setColor} value={color} />
            </div>
          </div>
          <fieldset className="border-t border-outline-variant pt-4">
            <legend className="font-label-md text-label-md text-on-surface-variant">Repetir</legend>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {(
                [
                  [null, "No repetir"],
                  ["DAILY", "Diario"],
                  ["WEEKLY", "Semanal"],
                  ["MONTHLY", "Mensual"],
                  ["YEARLY", "Anual"],
                ] as const
              ).map(([value, label]) => (
                <button
                  className={cn(
                    "min-h-11 rounded-md border px-3 py-1.5 font-body-sm text-body-sm transition-colors",
                    recurrenceType === value
                      ? "border-primary bg-primary text-on-primary"
                      : "border-outline-variant text-on-surface-variant hover:bg-surface-container-low",
                  )}
                  key={value ?? "none"}
                  onClick={() => selectRecurrenceType(value)}
                  type="button"
                >
                  {label}
                </button>
              ))}
            </div>
            {recurrenceType && recurrenceType !== "DAILY" && (
              <div className="mt-2 flex items-center gap-2">
                <span className="font-label-md text-label-md text-on-surface-variant">Cada</span>
                <input
                  className="field w-16"
                  max={365}
                  min={1}
                  onChange={(e) => setRecurrenceInterval(Number(e.target.value) || 1)}
                  type="number"
                  value={recurrenceInterval}
                />
                <span className="font-body-sm text-body-sm text-on-surface-variant">
                  {recurrenceType === "WEEKLY" ? "semanas" : recurrenceType === "MONTHLY" ? "meses" : "años"}
                </span>
              </div>
            )}
            {recurrenceType === "WEEKLY" && (
              <div className="mt-2 flex flex-wrap gap-1">
                {["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"].map((label, day) => (
                  <button
                    aria-pressed={recurrenceDaysOfWeek.includes(day)}
                    className={cn(
                      "h-11 w-11 rounded-md border font-data-mono text-data-mono text-sm transition-colors sm:h-9 sm:w-9",
                      recurrenceDaysOfWeek.includes(day)
                        ? "border-primary bg-primary text-on-primary"
                        : "border-outline-variant text-on-surface-variant hover:bg-surface-container-low",
                    )}
                    key={day}
                    onClick={() => toggleWeekday(day)}
                    type="button"
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
            {recurrenceType === "MONTHLY" && (
              <div className="mt-2">
                <label className="block">
                  <span className="font-label-md text-label-md text-on-surface-variant">Día del mes</span>
                  <input
                    className="field mt-1 w-20"
                    max={31}
                    min={1}
                    onChange={(e) => setRecurrenceDayOfMonth(e.target.value ? Number(e.target.value) : null)}
                    type="number"
                    value={recurrenceDayOfMonth ?? ""}
                  />
                </label>
              </div>
            )}
            {recurrenceType === "YEARLY" && (
              <p className="mt-2 font-body-sm text-body-sm text-on-surface-variant">
                Se repite cada año en el día y mes de la fecha del evento.
              </p>
            )}
            {recurrenceType && (
              <div className="mt-2">
                <label className="block">
                  <span className="font-label-md text-label-md text-on-surface-variant">Hasta (opcional)</span>
                  <input
                    className="field mt-1"
                    onChange={(e) => setRecurrenceEndsAt(e.target.value)}
                    type="date"
                    value={recurrenceEndsAt}
                  />
                </label>
              </div>
            )}
          </fieldset>
          <label className="block">
            <span className="font-label-md text-label-md text-on-surface-variant">Avisar antes</span>
            <select
              className="field mt-1"
              onChange={(event) => setRemindBeforeMin(Number(event.target.value))}
              value={remindBeforeMin}
            >
              {REMIND_OPTIONS.filter((option) => !allDay || ALL_DAY_REMIND_VALUES.includes(option.value)).map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
              {!REMIND_OPTIONS.some((option) => option.value === remindBeforeMin) && (
                <option value={remindBeforeMin}>{remindBeforeMin} minutos antes (actual)</option>
              )}
            </select>
          </label>
          {event && event.recurrenceType && (
            <fieldset className="border-t border-outline-variant pt-4">
              <legend className="font-label-md text-label-md text-on-surface-variant">Excepciones</legend>
              <div className="mt-2 space-y-2">
                {exceptions.length === 0 ? (
                  <p className="font-body-sm text-body-sm text-on-surface-variant">
                    Sin excepciones. Usa «Saltar hoy» o «Mover hoy» en la Agenda.
                  </p>
                ) : (
                  exceptions.map((exc) => (
                    <div className="flex items-center justify-between gap-3 border-b border-outline-variant py-2" key={exc.id}>
                      <span className="font-data-mono text-data-mono text-xs text-on-surface-variant">
                        {exc.action === "skip" ? "⏭ Saltado" : "↪ Movido"} ·{" "}
                        {new Date(`${exc.date.slice(0, 10)}T00:00:00`).toLocaleDateString("es", {
                          weekday: "short",
                          day: "numeric",
                          month: "short",
                        })}
                      </span>
                      {exc.action === "move" && exc.startMin !== null && exc.endMin !== null && (
                        <span className="font-data-mono text-data-mono text-xs">
                          {formatMin(exc.startMin)}–{formatMin(exc.endMin)}
                        </span>
                      )}
                      <button
                        className="min-h-11 rounded-md px-2 font-body-sm text-body-sm text-error transition-colors hover:bg-error-container/40 hover:underline"
                        disabled={deleteException.isPending}
                        onClick={() => void handleRemoveException(exc.id)}
                        type="button"
                      >
                        Eliminar
                      </button>
                    </div>
                  ))
                )}
              </div>
            </fieldset>
          )}
          <div className="flex flex-wrap justify-end gap-2 border-t border-outline-variant pt-4">
            {event && (
              <button
                className="mr-auto min-h-11 rounded-md border border-transparent px-4 py-2 font-body-sm text-body-sm text-error transition-colors hover:bg-error-container/30 disabled:opacity-50"
                disabled={deleteEvent.isPending}
                onClick={() => setDeleteConfirmOpen(true)}
                type="button"
              >
                Eliminar
              </button>
            )}
            <button
              className="min-h-11 rounded-md border border-outline-variant bg-surface px-4 py-2 font-body-sm text-body-sm text-on-surface-variant transition-colors hover:bg-surface-container-low disabled:opacity-50"
              disabled={saving}
              onClick={onClose}
              type="button"
            >
              Cancelar
            </button>
            <button
              className="min-h-11 rounded-md bg-primary px-4 py-2 font-body-sm text-body-sm text-on-primary transition-colors hover:bg-primary/90 disabled:opacity-50"
              disabled={saving}
              type="submit"
            >
              Guardar
            </button>
          </div>
        </form>
      </DialogContent>
      {deleteConfirmOpen && event && (
        <ConfirmModal
          cancelLabel="Cancelar"
          confirmLabel="Eliminar"
          danger
          loading={deleteEvent.isPending}
          message={<>¿Eliminar el evento «{event.title}»? Esta acción no se puede deshacer.</>}
          onClose={() => setDeleteConfirmOpen(false)}
          onConfirm={() => void handleDelete()}
          title="¿Eliminar evento?"
        />
      )}
    </Dialog>
  );
}
