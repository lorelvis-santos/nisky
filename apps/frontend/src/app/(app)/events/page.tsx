"use client";

import { useState } from "react";
import { Plus, X, MapPin, Clock } from "lucide-react";
import { useEventsQuery, useEventMutations } from "@/features/events/hooks/useEvents";
import type { CalendarEventPayload } from "@/features/events/api/events";
import type { CalendarEvent } from "@/types/entities";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { useModalScrollLock } from "@/hooks/useModalScrollLock";
import { toast } from "sonner";

function toLocalISODate(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

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
    const day = toLocalISODate(new Date(event.date));
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
                  {groupedEvents[day].map((event: CalendarEvent) => (
                    <button
                      key={event.id}
                      onClick={() => openEdit(event)}
                      className="flex flex-col text-left border border-outline-variant bg-surface p-4 hover:bg-surface-container-lowest transition-colors"
                      type="button"
                    >
                      <div className="font-headline-xs text-headline-xs font-semibold text-on-surface">
                        {event.title}
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
                  ))}
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
  const { createEvent, updateEvent, deleteEvent } = useEventMutations();
  useModalScrollLock();

  const [title, setTitle] = useState(event?.title ?? "");
  const [date, setDate] = useState(event ? toLocalISODate(new Date(event.date)) : toLocalISODate(new Date()));
  const [allDay, setAllDay] = useState(event?.allDay ?? false);
  const [startMin, setStartMin] = useState(event?.startMin ? formatMin(event.startMin) : "09:00");
  const [endMin, setEndMin] = useState(event?.endMin ? formatMin(event.endMin) : "10:00");
  const [location, setLocation] = useState(event?.location ?? "");
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return toast.error("El título es requerido");

    const payload: CalendarEventPayload = {
      title,
      date,
      allDay,
      startMin: allDay ? undefined : parseMin(startMin),
      endMin: allDay ? undefined : parseMin(endMin),
      location: location.trim() || undefined,
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
    } catch (err: any) {
      toast.error(err.response?.data?.error ?? "Error al guardar el evento");
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
          className="w-full max-w-md border border-outline-variant bg-surface"
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
          <form onSubmit={handleSave} className="space-y-4 p-5">
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
                onChange={(e) => setAllDay(e.target.checked)}
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
