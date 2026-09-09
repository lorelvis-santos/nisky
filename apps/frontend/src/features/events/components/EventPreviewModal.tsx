"use client";

import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { Bell, CalendarDays, ExternalLink, MapPin, Pencil, Repeat2, Video } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { toast } from "sonner";
import type { CalendarEvent } from "@/types/entities";
import type { CalendarEventPayload } from "@/features/events/api/events";
import { useEventMutations } from "@/features/events/hooks/useEvents";
import { PreviewSheet } from "@/components/ui/PreviewSheet";
import { DAY_NAMES, DAY_NAMES_SHORT, DAY_ORDER, minToTime, parseDateOnly, timeToMin } from "@/features/timeblocks/lib/time";
import { cn } from "@/lib/utils";

const REMIND_OPTIONS = [
  { value: 0, label: "Sin aviso" },
  { value: 5, label: "5 min antes" },
  { value: 10, label: "10 min antes" },
  { value: 15, label: "15 min antes" },
  { value: 30, label: "30 min antes" },
  { value: 60, label: "1 hora antes" },
  { value: 1440, label: "1 día antes" },
  { value: 10080, label: "1 semana antes" },
] as const;

type EventDraftField = "title" | "schedule" | "location" | "reminder";

function eventDate(value: string) {
  return parseDateOnly(value).toLocaleDateString("es-DO", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

function eventDuration(event: CalendarEvent) {
  if (event.allDay || event.startMin === null || event.endMin === null) return null;
  const duration = event.endMin - event.startMin;
  if (duration < 60) return `${duration} min`;
  const hours = Math.floor(duration / 60);
  const minutes = duration % 60;
  return minutes ? `${hours} h ${minutes} min` : `${hours} h`;
}

function reminderLabel(minutes: number) {
  if (minutes === 0) return "Sin aviso previo";
  if (minutes < 60) return `${minutes} min antes`;
  if (minutes % 60 === 0) return `${minutes / 60} ${minutes === 60 ? "hora" : "horas"} antes`;
  return `${minutes} min antes`;
}

function reminderOptions(currentValue: number) {
  if (REMIND_OPTIONS.some((option) => option.value === currentValue)) return REMIND_OPTIONS;
  return [...REMIND_OPTIONS, { value: currentValue, label: reminderLabel(currentValue) }].sort((a, b) => a.value - b.value);
}

function recurrenceLabel(event: CalendarEvent) {
  if (!event.recurrenceType) return "";
  const interval = Math.max(event.recurrenceInterval, 1);
  if (event.recurrenceType === "DAILY") return interval === 1 ? "Cada día" : `Cada ${interval} días`;
  if (event.recurrenceType === "MONTHLY") {
    const cadence = interval === 1 ? "Cada mes" : `Cada ${interval} meses`;
    return event.recurrenceDayOfMonth ? `${cadence} · día ${event.recurrenceDayOfMonth}` : cadence;
  }
  if (event.recurrenceType === "YEARLY") return interval === 1 ? "Cada año" : `Cada ${interval} años`;

  const days = event.recurrenceDaysOfWeek
    .slice()
    .sort((a, b) => DAY_ORDER.indexOf(a) - DAY_ORDER.indexOf(b))
    .map((day) => DAY_NAMES_SHORT[day] ?? DAY_NAMES[day])
    .join(", ");
  const cadence = interval === 1 ? "Cada semana" : `Cada ${interval} semanas`;
  return days ? `${cadence} · ${days}` : cadence;
}

function externalUrl(value: string | null) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function resizeTitleInput(input: HTMLTextAreaElement) {
  input.style.height = "auto";
  input.style.height = `${Math.min(input.scrollHeight, 112)}px`;
}

function scheduleDraftFrom(event: CalendarEvent) {
  return {
    allDay: event.allDay,
    date: event.date.slice(0, 10),
    endTime: event.endMin === null ? "10:00" : minToTime(event.endMin),
    startTime: event.startMin === null ? "09:00" : minToTime(event.startMin),
  };
}

function DetailRow({ icon: Icon, children, divided = false }: { icon: LucideIcon; children: ReactNode; divided?: boolean }) {
  return (
    <div className={cn("flex items-start gap-3", divided && "border-t border-outline-variant/70 pt-4")}>
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-outline-variant/70 bg-surface-container-lowest text-on-surface-variant shadow-cadence-1">
        <Icon aria-hidden="true" size={18} />
      </span>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

export function EventPreviewModal({
  event,
  onClose,
  onEdit,
}: {
  event: CalendarEvent;
  onClose: () => void;
  onEdit: (event: CalendarEvent) => void;
}) {
  const { updateEvent } = useEventMutations();
  const [currentEvent, setCurrentEvent] = useState(event);
  const [titleEditing, setTitleEditing] = useState(false);
  const [titleDraft, setTitleDraft] = useState(event.title);
  const [scheduleEditing, setScheduleEditing] = useState(false);
  const [scheduleDraft, setScheduleDraft] = useState(() => scheduleDraftFrom(event));
  const [locationEditing, setLocationEditing] = useState(false);
  const [locationDraft, setLocationDraft] = useState(event.location ?? "");
  const [pendingField, setPendingField] = useState<EventDraftField | null>(null);
  const titleInputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!titleEditing || !titleInputRef.current) return;
    resizeTitleInput(titleInputRef.current);
    titleInputRef.current.focus();
    titleInputRef.current.select();
  }, [titleEditing]);

  const savePatch = async (field: EventDraftField, payload: Partial<CalendarEventPayload>, successMessage: string) => {
    if (pendingField) return null;
    setPendingField(field);
    try {
      const updated = await updateEvent.mutateAsync({ id: currentEvent.id, payload });
      setCurrentEvent(updated);
      toast.success(successMessage);
      return updated;
    } catch {
      toast.error("No pudimos actualizar el evento.");
      return null;
    } finally {
      setPendingField(null);
    }
  };

  const closeTitleEditor = () => {
    setTitleEditing(false);
    setTitleDraft(currentEvent.title);
  };

  const saveTitle = async () => {
    const title = titleDraft.trim();
    if (!title) {
      toast.error("El título no puede estar vacío.");
      return;
    }
    if (title === currentEvent.title) {
      closeTitleEditor();
      return;
    }
    const updated = await savePatch("title", { title }, "Título actualizado");
    if (updated) setTitleEditing(false);
  };

  const openScheduleEditor = () => {
    setScheduleDraft(scheduleDraftFrom(currentEvent));
    setScheduleEditing(true);
  };

  const cancelScheduleEditor = () => {
    setScheduleDraft(scheduleDraftFrom(currentEvent));
    setScheduleEditing(false);
  };

  const saveSchedule = async () => {
    if (!scheduleDraft.date) {
      toast.error("Selecciona una fecha.");
      return;
    }
    if (!scheduleDraft.allDay && timeToMin(scheduleDraft.endTime) <= timeToMin(scheduleDraft.startTime)) {
      toast.error("La hora final debe ser posterior a la inicial.");
      return;
    }
    const updated = await savePatch("schedule", {
      allDay: scheduleDraft.allDay,
      date: scheduleDraft.date,
      endMin: scheduleDraft.allDay ? undefined : timeToMin(scheduleDraft.endTime),
      startMin: scheduleDraft.allDay ? undefined : timeToMin(scheduleDraft.startTime),
    }, "Horario actualizado");
    if (updated) {
      setScheduleDraft(scheduleDraftFrom(updated));
      setScheduleEditing(false);
    }
  };

  const openLocationEditor = () => {
    setLocationDraft(currentEvent.location ?? "");
    setLocationEditing(true);
  };

  const cancelLocationEditor = () => {
    setLocationDraft(currentEvent.location ?? "");
    setLocationEditing(false);
  };

  const saveLocation = async () => {
    const updated = await savePatch("location", { location: locationDraft.trim() }, "Ubicación actualizada");
    if (updated) setLocationEditing(false);
  };

  const saveReminder = async (value: number) => {
    if (value === currentEvent.remindBeforeMin) return;
    await savePatch("reminder", { remindBeforeMin: value }, "Recordatorio actualizado");
  };

  const time = currentEvent.allDay || currentEvent.startMin === null || currentEvent.endMin === null
    ? "Todo el día"
    : `${minToTime(currentEvent.startMin)} – ${minToTime(currentEvent.endMin)}`;
  const duration = eventDuration(currentEvent);
  const meetingUrl = externalUrl(currentEvent.location);

  return (
    <PreviewSheet
      eyebrow="Evento"
      eyebrowBadge
      eyebrowClassName="border-secondary/20 bg-secondary-container text-secondary"
      bodyHeader={
        <div className="mb-5 min-w-0">
          <div className="flex min-w-0 items-start gap-3">
            <span aria-hidden="true" className="mt-2.5 size-3.5 shrink-0 rounded-full shadow-sm" style={{ backgroundColor: currentEvent.color ?? "#303e51" }} />
            {titleEditing ? (
              <textarea
                aria-busy={pendingField === "title"}
                aria-label="Título del evento"
                autoComplete="off"
                className="block max-h-28 min-h-0 w-full min-w-0 resize-none overflow-x-hidden overflow-y-auto whitespace-pre-wrap break-words border-0 bg-transparent p-0 font-headline-md text-headline-md text-on-surface outline-none focus:border-0 focus:outline-none focus:ring-0 [overflow-wrap:anywhere] sm:font-headline-lg sm:text-headline-lg"
                data-vaul-no-drag
                disabled={pendingField !== null}
                maxLength={200}
                onBlur={() => {
                  window.requestAnimationFrame(() => {
                    if (document.activeElement !== titleInputRef.current && pendingField !== "title") void saveTitle();
                  });
                }}
                onChange={(event) => {
                  setTitleDraft(event.target.value);
                  resizeTitleInput(event.currentTarget);
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    void saveTitle();
                  }
                  if (event.key === "Escape") {
                    event.preventDefault();
                    closeTitleEditor();
                  }
                }}
                ref={titleInputRef}
                rows={1}
                value={titleDraft}
                wrap="soft"
              />
            ) : (
              <button
                aria-label="Editar título del evento"
                className="group inline-flex max-w-full items-start gap-2 text-left"
                disabled={pendingField !== null}
                onClick={() => {
                  setTitleDraft(currentEvent.title);
                  setTitleEditing(true);
                }}
                type="button"
              >
                <span className="min-w-0 break-words font-headline-md text-headline-md text-on-surface [overflow-wrap:anywhere] sm:font-headline-lg sm:text-headline-lg">{currentEvent.title}</span>
                <Pencil aria-hidden="true" className="mt-1 shrink-0 opacity-0 transition-opacity group-hover:opacity-60" size={14} />
              </button>
            )}
          </div>
        </div>
      }
      footer={
        <div className="flex w-full gap-2.5">
          {meetingUrl && (
            <a
              className="inline-flex min-h-12 flex-1 items-center justify-center gap-1.5 rounded-xl border border-outline-variant bg-surface-container-lowest px-3 font-label-md text-label-md font-semibold text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface"
              href={meetingUrl}
              rel="noreferrer"
              target="_blank"
            >
              <Video aria-hidden="true" size={16} /> Unirse
            </a>
          )}
          <button
            className={cn("inline-flex min-h-12 items-center justify-center gap-1.5 rounded-xl bg-primary px-3 font-label-md text-label-md font-semibold text-on-primary hover:bg-primary-container hover:text-on-primary-container", meetingUrl ? "flex-1" : "w-full")}
            disabled={pendingField !== null}
            onClick={() => onEdit(currentEvent)}
            type="button"
          >
            <Pencil aria-hidden="true" size={16} /> Editar evento
          </button>
        </div>
      }
      onClose={onClose}
      title={currentEvent.title}
      titlePlacement="body"
    >
      <div className="space-y-5">
        <section className="overflow-hidden rounded-2xl border border-outline-variant/70 bg-surface-container-low/70 p-4 sm:p-5">
          <div className="space-y-4">
            <DetailRow icon={CalendarDays}>
              {scheduleEditing ? (
                <div className="space-y-3">
                  <p className="font-label-caps text-label-caps uppercase text-on-surface-variant">Fecha y horario</p>
                  <label className="block">
                    <span className="font-label-md text-label-md text-on-surface-variant">Fecha</span>
                    <input className="field mt-1" disabled={pendingField !== null} onChange={(event) => setScheduleDraft((current) => ({ ...current, date: event.target.value }))} type="date" value={scheduleDraft.date} />
                  </label>
                  <label className="flex min-h-11 items-center gap-2 font-body-sm text-body-sm text-on-surface">
                    <input checked={scheduleDraft.allDay} className="size-5 accent-tertiary" disabled={pendingField !== null} onChange={(event) => setScheduleDraft((current) => ({ ...current, allDay: event.target.checked }))} type="checkbox" />
                    Todo el día
                  </label>
                  {!scheduleDraft.allDay && (
                    <div className="grid grid-cols-2 gap-3">
                      <label className="block">
                        <span className="font-label-md text-label-md text-on-surface-variant">Inicio</span>
                        <input className="field mt-1" disabled={pendingField !== null} onChange={(event) => setScheduleDraft((current) => ({ ...current, startTime: event.target.value }))} type="time" value={scheduleDraft.startTime} />
                      </label>
                      <label className="block">
                        <span className="font-label-md text-label-md text-on-surface-variant">Fin</span>
                        <input className="field mt-1" disabled={pendingField !== null} onChange={(event) => setScheduleDraft((current) => ({ ...current, endTime: event.target.value }))} type="time" value={scheduleDraft.endTime} />
                      </label>
                    </div>
                  )}
                  <div className="flex justify-end gap-2">
                    <button className="min-h-10 rounded-lg px-3 font-label-md text-label-md text-on-surface-variant hover:bg-surface-container-low" disabled={pendingField !== null} onClick={cancelScheduleEditor} type="button">Cancelar</button>
                    <button className="min-h-10 rounded-lg bg-primary px-3 font-label-md text-label-md font-semibold text-on-primary disabled:opacity-60" disabled={pendingField !== null} onClick={() => void saveSchedule()} type="button">Guardar</button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start justify-between gap-2">
                  <button aria-label="Editar fecha y horario" className="min-w-0 flex-1 text-left" disabled={pendingField !== null} onClick={openScheduleEditor} type="button">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-body-md text-body-md font-semibold capitalize text-on-surface">{eventDate(currentEvent.date)}</p>
                      {duration && <span className="rounded-full bg-surface-container px-2.5 py-1 font-label-md text-label-md font-semibold text-on-surface-variant">{duration}</span>}
                    </div>
                    <p className="mt-0.5 font-body-sm text-body-sm text-on-surface-variant">{time}{!currentEvent.allDay && " · hora local"}</p>
                  </button>
                  <Pencil aria-hidden="true" className="mt-1 shrink-0 text-on-surface-variant" size={14} />
                </div>
              )}
            </DetailRow>

            <DetailRow divided icon={MapPin}>
              {locationEditing ? (
                <div className="space-y-2">
                  <label className="block">
                    <span className="font-label-caps text-label-caps uppercase text-on-surface-variant">Ubicación o enlace</span>
                    <input autoFocus className="field mt-1" disabled={pendingField !== null} onChange={(event) => setLocationDraft(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") void saveLocation(); if (event.key === "Escape") cancelLocationEditor(); }} placeholder="Ej. Sala A o https://meet.google.com/..." value={locationDraft} />
                  </label>
                  <div className="flex justify-end gap-2">
                    <button className="min-h-10 rounded-lg px-3 font-label-md text-label-md text-on-surface-variant hover:bg-surface-container-low" disabled={pendingField !== null} onClick={cancelLocationEditor} type="button">Cancelar</button>
                    <button className="min-h-10 rounded-lg bg-primary px-3 font-label-md text-label-md font-semibold text-on-primary disabled:opacity-60" disabled={pendingField !== null} onClick={() => void saveLocation()} type="button">Guardar</button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start justify-between gap-2">
                  <button aria-label={currentEvent.location ? "Editar ubicación" : "Añadir ubicación"} className="min-w-0 flex-1 text-left" disabled={pendingField !== null} onClick={openLocationEditor} type="button">
                    <p className="font-label-caps text-label-caps uppercase text-on-surface-variant">Ubicación</p>
                    {currentEvent.location ? (
                      meetingUrl ? (
                        <span className="mt-1 inline-flex min-w-0 items-start gap-1.5 break-words font-body-md text-body-md font-semibold text-secondary [overflow-wrap:anywhere]"><ExternalLink aria-hidden="true" className="mt-0.5 shrink-0" size={15} />{currentEvent.location}</span>
                      ) : (
                        <span className="mt-1 block break-words font-body-md text-body-md font-semibold text-on-surface [overflow-wrap:anywhere]">{currentEvent.location}</span>
                      )
                    ) : (
                      <span className="mt-1 block font-body-sm text-body-sm font-semibold text-secondary">Añadir ubicación</span>
                    )}
                  </button>
                  <Pencil aria-hidden="true" className="mt-1 shrink-0 text-on-surface-variant" size={14} />
                </div>
              )}
            </DetailRow>

            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-outline-variant/70 pt-4 font-body-sm text-body-sm text-on-surface-variant">
              {currentEvent.recurrenceType && (
                <div className="flex min-w-0 items-start gap-1.5">
                  <Repeat2 aria-hidden="true" className="mt-0.5 shrink-0" size={15} />
                  <span className="break-words [overflow-wrap:anywhere]">{recurrenceLabel(currentEvent)}{currentEvent.recurrenceEndsAt ? ` · hasta ${eventDate(currentEvent.recurrenceEndsAt)}` : ""}</span>
                </div>
              )}
              <label className="flex min-w-0 items-center gap-1.5">
                <Bell aria-hidden="true" className="shrink-0 text-tertiary" size={15} />
                <span className="sr-only">Recordatorio</span>
                <select aria-label="Cambiar recordatorio" className="max-w-[11rem] cursor-pointer rounded-lg border border-transparent bg-transparent px-1 py-1 font-body-sm text-body-sm font-medium text-on-surface-variant hover:bg-surface-container-low focus:border-outline focus:outline-none disabled:cursor-wait disabled:opacity-60" disabled={pendingField !== null} onChange={(event) => void saveReminder(Number(event.target.value))} value={currentEvent.remindBeforeMin}>
                  {reminderOptions(currentEvent.remindBeforeMin).map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </label>
            </div>
          </div>
        </section>
      </div>
    </PreviewSheet>
  );
}
