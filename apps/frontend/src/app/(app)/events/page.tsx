"use client";

import { useEffect, useState } from "react";
import { Plus, X, MapPin, Clock } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useEventsQuery, useEventMutations, useEventExceptionsQuery } from "@/features/events/hooks/useEvents";
import type { CalendarEventPayload } from "@/features/events/api/events";
import type { CalendarEvent, EventRecurrenceType } from "@/types/entities";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { ColorPicker, PROJECT_COLORS } from "@/components/ui/ColorPicker";
import { hexToRgba, parseDateOnly } from "@/features/timeblocks/lib/time";
import { useModalScrollLock } from "@/hooks/useModalScrollLock";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

function toLocalISODate(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
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

export default function EventsPage() {
  const [currentMonth, setCurrentMonth] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d;
  });
  
  const from = toLocalISODate(currentMonth);
  const toDate = new Date(currentMonth);
  toDate.setMonth(toDate.getMonth() + 1);
  toDate.setDate(0);
  const to = toLocalISODate(toDate);
  
  const { data: events = [], isLoading } = useEventsQuery(from, to);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const searchParams = useSearchParams();
  const eventIdParam = searchParams.get("eventId");

  useEffect(() => {
    if (!eventIdParam || isModalOpen || isLoading) return;
    const target = events.find((event) => event.id === eventIdParam);
    if (target) {
      setEditingEvent(target);
      setIsModalOpen(true);
    }
  }, [eventIdParam, events, isModalOpen, isLoading]);

  const prevMonth = () => setCurrentMonth(m => {
    const d = new Date(m);
    d.setMonth(d.getMonth() - 1);
    return d;
  });
  const nextMonth = () => setCurrentMonth(m => {
    const d = new Date(m);
    d.setMonth(d.getMonth() + 1);
    return d;
  });

  const openCreate = () => {
    setEditingEvent(null);
    setIsModalOpen(true);
  };

  const openEdit = (event: CalendarEvent) => {
    setEditingEvent(event);
    setIsModalOpen(true);
  };

  // Agrupar eventos por día
  const groupedEvents = events.reduce((acc: Record<string, CalendarEvent[]>, event: CalendarEvent) => {
    const day = toLocalISODate(parseDateOnly(event.date));
    if (!acc[day]) acc[day] = [];
    acc[day].push(event);
    return acc;
  }, {});

  const sortedDays = Object.keys(groupedEvents).sort();

  return (
    <div className="flex h-full flex-col bg-surface">
      <div className="flex items-center justify-between border-b border-outline-variant p-container-padding">
        <div className="flex items-center gap-4">
          <button onClick={prevMonth} className="p-2 hover:bg-surface-container-low border border-outline-variant" type="button">&lt;</button>
          <h2 className="font-headline-sm text-headline-sm">
            {currentMonth.toLocaleDateString("es", { month: "long", year: "numeric" }).replace(/^\p{L}/u, (char) => char.toUpperCase())}
          </h2>
          <button onClick={nextMonth} className="p-2 hover:bg-surface-container-low border border-outline-variant" type="button">&gt;</button>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 bg-primary-container px-4 py-2 font-body-sm text-body-sm text-on-primary hover:bg-primary disabled:opacity-50"
          type="button"
        >
          <Plus size={20} />
          Nuevo evento
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-container-padding">
        {isLoading ? (
          <p className="text-on-surface-variant">Cargando...</p>
        ) : sortedDays.length === 0 ? (
          <p className="text-on-surface-variant py-8 text-center">No hay eventos este mes.</p>
        ) : (
          <div className="space-y-8">
            {sortedDays.map(day => (
              <div key={day}>
                <h3 className="mb-4 font-headline-xs text-headline-xs border-b border-outline-variant pb-2">
                  {new Date(day + "T00:00:00").toLocaleDateString("es", { weekday: "long", day: "numeric", month: "long" })}
                </h3>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {groupedEvents[day].map((event: CalendarEvent) => {
                    const eventColor = event.color ?? "#303e51";
                    return (
                      <button
                        key={event.id}
                        onClick={() => openEdit(event)}
                        className="flex flex-col border border-outline-variant p-4 text-left transition-colors hover:border-outline"
                        style={{ borderLeft: `3px solid ${eventColor}`, backgroundColor: hexToRgba(eventColor, 0.06) }}
                        type="button"
                      >
                        <div className="flex items-center gap-2">
                          <span aria-hidden="true" className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: eventColor }} />
                          <div className="font-headline-xs text-headline-xs font-semibold text-on-surface">
                            {event.title}
                          </div>
                        </div>
                        <div className="mt-2 flex items-center gap-4 font-body-sm text-body-sm text-on-surface-variant">
                          <div className="flex items-center gap-1">
                            <Clock size={14} />
                            {event.allDay ? "Todo el día" : `${formatMin(event.startMin!)} - ${formatMin(event.endMin!)}`}
                          </div>
                          {event.location && (
                            <div className="flex items-center gap-1 truncate">
                              <MapPin size={14} />
                              <span className="truncate">{event.location}</span>
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {isModalOpen && (
        <EventModal
          event={editingEvent}
          onClose={() => setIsModalOpen(false)}
        />
      )}
    </div>
  );
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

function EventModal({ event, onClose }: { event: CalendarEvent | null; onClose: () => void }) {
  const { createEvent, updateEvent, deleteEvent, deleteException } = useEventMutations();
  useModalScrollLock();

  const [title, setTitle] = useState(event?.title ?? "");
  const [date, setDate] = useState(event ? toLocalISODate(parseDateOnly(event.date)) : toLocalISODate(new Date()));
  const [allDay, setAllDay] = useState(event?.allDay ?? false);
  const [startMin, setStartMin] = useState(event?.startMin ? formatMin(event.startMin) : "09:00");
  const [endMin, setEndMin] = useState(event?.endMin ? formatMin(event.endMin) : "10:00");
  const [location, setLocation] = useState(event?.location ?? "");
  const [color, setColor] = useState(event?.color ?? PROJECT_COLORS[Math.floor(Math.random() * PROJECT_COLORS.length)]);
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
    if (recurrenceType === "WEEKLY" && recurrenceDaysOfWeek.length === 0) {
      return toast.error("Elige al menos un día para la recurrencia semanal");
    }
    if (recurrenceType === "MONTHLY" && (recurrenceDayOfMonth === null || recurrenceDayOfMonth < 1)) {
      return toast.error("Indica el día del mes para la recurrencia mensual");
    }

    const payload: CalendarEventPayload = {
      title,
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
    <>
      <div
        aria-modal="true"
        className="fixed inset-0 z-[60] flex items-center justify-center bg-on-surface/20 p-4 backdrop-blur-[1px]"
        onClick={onClose}
        role="dialog"
      >
        <div
          className="flex max-h-[90vh] w-full max-w-md flex-col border border-outline-variant bg-surface"
          data-modal-scroll
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between border-b border-outline-variant bg-surface-bright px-5 py-4">
            <h2 className="font-headline-xs text-headline-xs font-bold text-primary">
              {event ? "Editar evento" : "Nuevo evento"}
            </h2>
            <button
              aria-label="Cerrar"
              className="text-on-surface-variant hover:text-on-surface"
              onClick={onClose}
              type="button"
            >
              <X size={19} />
            </button>
          </div>
          <form onSubmit={handleSave} className="space-y-4 overflow-y-auto p-5" data-modal-scroll>
            <label className="block">
              <span className="font-label-caps text-label-caps text-on-surface-variant">TÍTULO</span>
              <input
                autoFocus
                className="field mt-1"
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ej. Reunión de equipo"
                value={title}
              />
            </label>
            <label className="block">
              <span className="font-label-caps text-label-caps text-on-surface-variant">FECHA</span>
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
              <label className="font-body-sm text-body-sm" htmlFor="allDay">Todo el día</label>
            </div>
            {!allDay && (
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="font-label-caps text-label-caps text-on-surface-variant">INICIO</span>
                  <input
                    className="field mt-1"
                    onChange={(e) => setStartMin(e.target.value)}
                    type="time"
                    value={startMin}
                  />
                </label>
                <label className="block">
                  <span className="font-label-caps text-label-caps text-on-surface-variant">FIN</span>
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
              <span className="font-label-caps text-label-caps text-on-surface-variant">UBICACIÓN (OPCIONAL)</span>
              <input
                className="field mt-1"
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Ej. Sala A o enlace de Meet"
                value={location}
              />
            </label>
            <div className="block">
              <span className="font-label-caps text-label-caps text-on-surface-variant">COLOR</span>
              <div className="mt-2">
                <ColorPicker onChange={setColor} value={color} />
              </div>
            </div>
            <fieldset className="border-t border-outline-variant pt-4">
              <legend className="font-label-caps text-label-caps text-on-surface-variant">REPETIR</legend>
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
                      "border px-3 py-1.5 font-body-sm text-body-sm",
                      recurrenceType === value
                        ? "bg-primary-container text-on-primary"
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
                  <span className="font-label-caps text-label-caps text-on-surface-variant">CADA</span>
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
                        "h-8 w-8 border font-data-mono text-data-mono text-sm",
                        recurrenceDaysOfWeek.includes(day)
                          ? "border-primary bg-primary-container text-on-primary"
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
                    <span className="font-label-caps text-label-caps text-on-surface-variant">DÍA DEL MES</span>
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
                    <span className="font-label-caps text-label-caps text-on-surface-variant">HASTA (OPCIONAL)</span>
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
              <span className="font-label-caps text-label-caps text-on-surface-variant">AVISAR ANTES</span>
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
                <legend className="font-label-caps text-label-caps text-on-surface-variant">EXCEPCIONES</legend>
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
                          className="font-body-sm text-body-sm text-error hover:underline"
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
            <div className="flex justify-end gap-2 border-t border-outline-variant pt-4">
              {event && (
                <button
                  className="mr-auto border border-transparent px-4 py-2 font-body-sm text-body-sm text-error hover:bg-error-container/30 disabled:opacity-50"
                  disabled={deleteEvent.isPending}
                  onClick={() => setDeleteConfirmOpen(true)}
                  type="button"
                >
                  Eliminar
                </button>
              )}
              <button
                className="border border-outline-variant px-4 py-2 font-body-sm text-body-sm text-on-surface-variant hover:bg-surface-container-low disabled:opacity-50"
                disabled={saving}
                onClick={onClose}
                type="button"
              >
                Cancelar
              </button>
              <button
                className="bg-primary-container px-4 py-2 font-body-sm text-body-sm text-on-primary hover:bg-primary disabled:opacity-50"
                disabled={saving}
                type="submit"
              >
                Guardar
              </button>
            </div>
          </form>
        </div>
      </div>
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
    </>
  );
}
