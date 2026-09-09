"use client";

import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { Bell, CalendarDays, CheckCircle2, Clock3, PauseCircle, Pencil, PlayCircle, Repeat2 } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { toast } from "sonner";
import type { Project, TimeBlock } from "@/types/entities";
import { PreviewSheet } from "@/components/ui/PreviewSheet";
import type { UpdateTimeBlockPayload } from "../api/timeblocks";
import { useTimeBlockMutations } from "../hooks/useTimeBlocks";
import { DAY_NAMES, DAY_NAMES_SHORT, DAY_ORDER, minToTime, parseDateOnly, timeToMin } from "../lib/time";
import { cn } from "@/lib/utils";

const REMIND_OPTIONS = [
  { value: 0, label: "Sin aviso" },
  { value: 5, label: "5 min antes" },
  { value: 10, label: "10 min antes" },
  { value: 15, label: "15 min antes" },
  { value: 30, label: "30 min antes" },
  { value: 60, label: "1 hora antes" },
] as const;

type BlockDraftField = "name" | "schedule" | "reminder" | "active";

function blockDate(value: string | Date) {
  const date = typeof value === "string" ? parseDateOnly(value) : value;
  return date.toLocaleDateString("es-DO", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

function reminderLabel(minutes: number) {
  if (minutes === 0) return "Sin aviso previo";
  if (minutes < 60) return `${minutes} minutos antes`;
  if (minutes % 60 === 0) return `${minutes / 60} ${minutes === 60 ? "hora" : "horas"} antes`;
  return `${minutes} minutos antes`;
}

function reminderOptions(currentValue: number) {
  if (REMIND_OPTIONS.some((option) => option.value === currentValue)) return REMIND_OPTIONS;
  return [...REMIND_OPTIONS, { value: currentValue, label: reminderLabel(currentValue) }].sort((a, b) => a.value - b.value);
}

function blockDuration(block: TimeBlock) {
  const duration = block.endMin - block.startMin;
  if (duration < 60) return `${duration} min`;
  const hours = Math.floor(duration / 60);
  const minutes = duration % 60;
  return minutes ? `${hours} h ${minutes} min` : `${hours} h`;
}

function orderedDays(days: number[]) {
  return days.slice().sort((a, b) => DAY_ORDER.indexOf(a) - DAY_ORDER.indexOf(b));
}

function blockDaysLabel(block: TimeBlock) {
  return orderedDays(block.daysOfWeek).map((day) => DAY_NAMES[day]).join(", ");
}

function scheduleDraftFrom(block: TimeBlock) {
  return {
    endTime: minToTime(block.endMin),
    startTime: minToTime(block.startMin),
  };
}

function resizeTitleInput(input: HTMLTextAreaElement) {
  input.style.height = "auto";
  input.style.height = `${Math.min(input.scrollHeight, 112)}px`;
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

export function TimeBlockPreviewModal({
  block,
  project,
  occurrenceDate,
  onClose,
  onEdit,
}: {
  block: TimeBlock;
  project?: Project | null;
  occurrenceDate?: Date;
  onClose: () => void;
  onEdit: (block: TimeBlock) => void;
}) {
  const { update } = useTimeBlockMutations();
  const [currentBlock, setCurrentBlock] = useState(block);
  const [nameEditing, setNameEditing] = useState(false);
  const [nameDraft, setNameDraft] = useState(block.name ?? "");
  const [scheduleEditing, setScheduleEditing] = useState(false);
  const [scheduleDraft, setScheduleDraft] = useState(() => scheduleDraftFrom(block));
  const [pendingField, setPendingField] = useState<BlockDraftField | null>(null);
  const titleInputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!nameEditing || !titleInputRef.current) return;
    resizeTitleInput(titleInputRef.current);
    titleInputRef.current.focus();
    titleInputRef.current.select();
  }, [nameEditing]);

  const savePatch = async (field: BlockDraftField, payload: UpdateTimeBlockPayload, successMessage: string) => {
    if (pendingField) return null;
    setPendingField(field);
    try {
      const updated = await update.mutateAsync({ id: currentBlock.id, payload });
      setCurrentBlock(updated);
      toast.success(successMessage);
      return updated;
    } catch {
      toast.error("No pudimos actualizar el bloque.");
      return null;
    } finally {
      setPendingField(null);
    }
  };

  const closeNameEditor = () => {
    setNameEditing(false);
    setNameDraft(currentBlock.name ?? "");
  };

  const saveName = async () => {
    const name = nameDraft.trim();
    if (name === (currentBlock.name ?? "")) {
      closeNameEditor();
      return;
    }
    const updated = await savePatch("name", { name: name || null }, "Nombre actualizado");
    if (updated) setNameEditing(false);
  };

  const openScheduleEditor = () => {
    setScheduleDraft(scheduleDraftFrom(currentBlock));
    setScheduleEditing(true);
  };

  const cancelScheduleEditor = () => {
    setScheduleDraft(scheduleDraftFrom(currentBlock));
    setScheduleEditing(false);
  };

  const saveSchedule = async () => {
    const startMin = timeToMin(scheduleDraft.startTime);
    const endMin = timeToMin(scheduleDraft.endTime);
    if (endMin - startMin < 5) {
      toast.error("El bloque debe durar al menos 5 minutos.");
      return;
    }
    const updated = await savePatch("schedule", { startMin, endMin }, "Horario actualizado");
    if (updated) {
      setScheduleDraft(scheduleDraftFrom(updated));
      setScheduleEditing(false);
    }
  };

  const saveReminder = async (value: number) => {
    if (value === currentBlock.remindBeforeMin) return;
    await savePatch("reminder", { remindBeforeMin: value }, "Recordatorio actualizado");
  };

  const toggleActive = async () => {
    await savePatch("active", { isActive: !currentBlock.isActive }, currentBlock.isActive ? "Bloque pausado" : "Bloque activado");
  };

  const title = currentBlock.name ?? project?.name ?? "Tiempo libre";
  const recurring = !currentBlock.date;

  return (
    <PreviewSheet
      eyebrow="Bloque de tiempo"
      eyebrowBadge
      eyebrowClassName="border-primary/20 bg-primary-fixed text-primary"
      bodyHeader={
        <div className="mb-5 min-w-0 space-y-2.5">
          {nameEditing ? (
            <textarea
              aria-busy={pendingField === "name"}
              aria-label="Nombre del bloque"
              autoComplete="off"
              className="block max-h-28 min-h-0 w-full min-w-0 resize-none overflow-x-hidden overflow-y-auto whitespace-pre-wrap break-words border-0 bg-transparent p-0 font-headline-lg text-headline-lg text-on-surface outline-none focus:border-0 focus:outline-none focus:ring-0 [overflow-wrap:anywhere]"
              data-vaul-no-drag
              disabled={pendingField !== null}
              maxLength={100}
              onBlur={() => {
                window.requestAnimationFrame(() => {
                  if (document.activeElement !== titleInputRef.current && pendingField !== "name") void saveName();
                });
              }}
              onChange={(event) => {
                setNameDraft(event.target.value);
                resizeTitleInput(event.currentTarget);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void saveName();
                }
                if (event.key === "Escape") {
                  event.preventDefault();
                  closeNameEditor();
                }
              }}
              placeholder="Nombre del bloque"
              ref={titleInputRef}
              rows={1}
              value={nameDraft}
              wrap="soft"
            />
          ) : (
            <button
              aria-label="Editar nombre del bloque"
              className="group inline-flex max-w-full items-start gap-2 text-left"
              disabled={pendingField !== null}
              onClick={() => {
                setNameDraft(currentBlock.name ?? "");
                setNameEditing(true);
              }}
              type="button"
            >
              <span className="min-w-0 break-words font-headline-lg text-headline-lg text-on-surface [overflow-wrap:anywhere]">{title}</span>
              <Pencil aria-hidden="true" className="mt-1 shrink-0 opacity-0 transition-opacity group-hover:opacity-60" size={14} />
            </button>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <span className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-label-md text-label-md font-semibold",
              currentBlock.isActive ? "bg-tertiary-container text-on-tertiary-container" : "bg-surface-container text-on-surface-variant",
            )}>
              {currentBlock.isActive ? <CheckCircle2 aria-hidden="true" size={13} /> : <PauseCircle aria-hidden="true" size={13} />}
              {currentBlock.isActive ? "Activo" : "Pausado"}
            </span>
            {project && (
              <span className="inline-flex min-w-0 items-center gap-1.5 rounded-full bg-surface-container px-3 py-1 font-label-md text-label-md text-on-surface-variant">
                <span aria-hidden="true" className="size-2 shrink-0 rounded-full" style={{ backgroundColor: project.color }} />
                <span className="truncate">{project.name}</span>
              </span>
            )}
          </div>
        </div>
      }
      footer={
        <div className="flex w-full gap-2.5">
          <button
            className="inline-flex min-h-12 flex-1 items-center justify-center gap-1.5 rounded-xl border border-outline-variant bg-surface-container-lowest px-3 font-label-md text-label-md font-semibold text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface disabled:cursor-wait disabled:opacity-60"
            disabled={pendingField !== null}
            onClick={() => void toggleActive()}
            type="button"
          >
            {currentBlock.isActive ? <PauseCircle aria-hidden="true" size={16} /> : <PlayCircle aria-hidden="true" size={16} />}
            {currentBlock.isActive ? "Pausar" : "Activar"}
          </button>
          <button
            className="inline-flex min-h-12 flex-1 items-center justify-center gap-1.5 rounded-xl bg-primary px-3 font-label-md text-label-md font-semibold text-on-primary hover:bg-primary-container hover:text-on-primary-container disabled:opacity-60"
            disabled={pendingField !== null}
            onClick={() => onEdit(currentBlock)}
            type="button"
          >
            <Pencil aria-hidden="true" size={16} /> Editar bloque
          </button>
        </div>
      }
      onClose={onClose}
      title={title}
      titlePlacement="body"
    >
      <div className="space-y-5">
        <section className="overflow-hidden rounded-2xl border border-outline-variant/70 bg-surface-container-low/70 p-4 sm:p-5">
          <div className="space-y-4">
            <DetailRow icon={Clock3}>
              {scheduleEditing ? (
                <div className="space-y-3">
                  <p className="font-label-caps text-label-caps uppercase text-on-surface-variant">Horario</p>
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
                  <div className="flex justify-end gap-2">
                    <button className="min-h-10 rounded-lg px-3 font-label-md text-label-md text-on-surface-variant hover:bg-surface-container-low" disabled={pendingField !== null} onClick={cancelScheduleEditor} type="button">Cancelar</button>
                    <button className="min-h-10 rounded-lg bg-primary px-3 font-label-md text-label-md font-semibold text-on-primary disabled:opacity-60" disabled={pendingField !== null} onClick={() => void saveSchedule()} type="button">Guardar</button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start justify-between gap-2">
                  <button aria-label="Editar horario del bloque" className="min-w-0 flex-1 text-left" disabled={pendingField !== null} onClick={openScheduleEditor} type="button">
                    <p className="font-label-caps text-label-caps uppercase text-on-surface-variant">{recurring ? "Horario habitual" : "Horario"}</p>
                    <div className="mt-0.5 flex flex-wrap items-center gap-2">
                      <span className="font-headline-md text-headline-md text-on-surface">{minToTime(currentBlock.startMin)} – {minToTime(currentBlock.endMin)}</span>
                      <span className="rounded-full bg-primary-fixed px-2.5 py-1 font-label-md text-label-md font-semibold text-primary">{blockDuration(currentBlock)}</span>
                    </div>
                  </button>
                  <Pencil aria-hidden="true" className="mt-1 shrink-0 text-on-surface-variant" size={14} />
                </div>
              )}
            </DetailRow>

            {recurring ? (
              <DetailRow divided icon={Repeat2}>
                <p className="font-label-caps text-label-caps uppercase text-on-surface-variant">Frecuencia</p>
                <p className="mt-0.5 break-words font-body-md text-body-md font-semibold text-on-surface [overflow-wrap:anywhere]">{blockDaysLabel(currentBlock)}</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {orderedDays(currentBlock.daysOfWeek).map((day) => (
                    <span className="flex size-6 items-center justify-center rounded-md bg-secondary text-[11px] font-bold text-on-secondary" key={day}>
                      {DAY_NAMES_SHORT[day]}
                    </span>
                  ))}
                </div>
                {currentBlock.repeatEveryWeeks > 1 && <p className="mt-2 font-body-sm text-body-sm text-on-surface-variant">Cada {currentBlock.repeatEveryWeeks} semanas</p>}
                {currentBlock.repeatEndsAt && <p className="mt-1 font-body-sm text-body-sm text-on-surface-variant">Hasta {blockDate(currentBlock.repeatEndsAt)}</p>}
              </DetailRow>
            ) : (
              <DetailRow divided icon={CalendarDays}>
                <p className="font-label-caps text-label-caps uppercase text-on-surface-variant">Fecha del bloque</p>
                <p className="mt-0.5 capitalize font-body-md text-body-md font-semibold text-on-surface">{blockDate(currentBlock.date ?? "")}</p>
              </DetailRow>
            )}

            <DetailRow divided icon={Bell}>
              <p className="font-label-caps text-label-caps uppercase text-on-surface-variant">Recordatorio</p>
              <select aria-label="Cambiar recordatorio" className="mt-0.5 max-w-[12rem] cursor-pointer rounded-lg border border-transparent bg-transparent px-1 py-1 font-body-md text-body-md font-semibold text-on-surface hover:bg-surface-container-low focus:border-outline focus:outline-none disabled:cursor-wait disabled:opacity-60" disabled={pendingField !== null} onChange={(event) => void saveReminder(Number(event.target.value))} value={currentBlock.remindBeforeMin}>
                {reminderOptions(currentBlock.remindBeforeMin).map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </DetailRow>

            {occurrenceDate && recurring && (
              <DetailRow divided icon={CalendarDays}>
                <p className="font-label-caps text-label-caps uppercase text-on-surface-variant">Ocurrencia seleccionada</p>
                <p className="mt-0.5 capitalize font-body-md text-body-md font-semibold text-on-surface">{blockDate(occurrenceDate)}</p>
              </DetailRow>
            )}
          </div>
        </section>
      </div>
    </PreviewSheet>
  );
}
