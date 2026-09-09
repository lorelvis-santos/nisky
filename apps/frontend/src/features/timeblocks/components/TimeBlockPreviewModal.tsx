"use client";

import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { Bell, CalendarDays, CalendarX, Check, CheckCircle2, ChevronDown, Clock3, PauseCircle, Pencil, PlayCircle, Repeat2 } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { toast } from "sonner";
import type { Project, TimeBlock } from "@/types/entities";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { PreviewSheet } from "@/components/ui/PreviewSheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useProjectsQuery } from "@/features/projects/hooks/useProjects";
import { TaskAssignmentPanel } from "./TaskAssignmentPanel";
import type { UpdateTimeBlockPayload } from "../api/timeblocks";
import { useTimeBlockMutations } from "../hooks/useTimeBlocks";
import { DAY_NAMES, DAY_NAMES_SHORT, DAY_ORDER, minToTime, parseDateOnly, timeToMin, toDateKey } from "../lib/time";
import { cn } from "@/lib/utils";

const REMIND_OPTIONS = [
  { value: 0, label: "Sin aviso" },
  { value: 5, label: "5 min antes" },
  { value: 10, label: "10 min antes" },
  { value: 15, label: "15 min antes" },
  { value: 30, label: "30 min antes" },
  { value: 60, label: "1 hora antes" },
] as const;

type BlockDraftField = "name" | "project" | "schedule" | "days" | "reminder" | "active";

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
  onSkipDay,
}: {
  block: TimeBlock;
  project?: Project | null;
  occurrenceDate?: Date;
  onClose: () => void;
  onEdit: (block: TimeBlock) => void;
  onSkipDay?: (date: string) => Promise<void>;
}) {
  const { update } = useTimeBlockMutations();
  const [currentBlock, setCurrentBlock] = useState(block);
  const [nameEditing, setNameEditing] = useState(false);
  const [nameDraft, setNameDraft] = useState(block.name ?? "");
  const [projectOpen, setProjectOpen] = useState(false);
  const [scheduleEditing, setScheduleEditing] = useState(false);
  const [scheduleDraft, setScheduleDraft] = useState(() => scheduleDraftFrom(block));
  const [pendingField, setPendingField] = useState<BlockDraftField | null>(null);
  const [skipConfirmOpen, setSkipConfirmOpen] = useState(false);
  const [skipPending, setSkipPending] = useState(false);
  const titleInputRef = useRef<HTMLTextAreaElement>(null);
  const projectsQuery = useProjectsQuery();

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

  const saveDays = async (values: string[]) => {
    const days = values.map(Number).filter(Number.isInteger);
    if (days.length === 0) {
      toast.error("Selecciona al menos un día.");
      return;
    }
    await savePatch("days", { daysOfWeek: orderedDays(days) }, "Frecuencia actualizada");
  };

  const saveReminder = async (value: number) => {
    if (value === currentBlock.remindBeforeMin) return;
    await savePatch("reminder", { remindBeforeMin: value }, "Recordatorio actualizado");
  };

  const toggleActive = async () => {
    await savePatch("active", { isActive: !currentBlock.isActive }, currentBlock.isActive ? "Bloque pausado" : "Bloque activado");
  };

  const projectOptions = Array.from(
    new Map(
      [...(projectsQuery.data ?? []), ...(project ? [project] : [])].map((option) => [option.id, option]),
    ).values(),
  );
  const selectedProject = projectOptions.find((option) => option.id === currentBlock.projectId) ?? null;
  const selectProject = async (projectId: string | null) => {
    setProjectOpen(false);
    await savePatch("project", { projectId }, "Proyecto actualizado");
  };

  const title = currentBlock.name ?? selectedProject?.name ?? "Tiempo libre";
  const recurring = !currentBlock.date;
  const occurrenceKey = occurrenceDate ? toDateKey(occurrenceDate) : null;

  const confirmSkip = async () => {
    if (!occurrenceKey || !onSkipDay || skipPending) return;
    setSkipPending(true);
    try {
      await onSkipDay(occurrenceKey);
      setSkipConfirmOpen(false);
      onClose();
    } finally {
      setSkipPending(false);
    }
  };

  return (
    <>
      <PreviewSheet
        eyebrow="Bloque de tiempo"
        eyebrowBadge
        eyebrowClassName="border-primary/20 bg-primary-fixed text-primary"
        bodyHeader={
          <div className="mb-5 min-w-0 space-y-2.5">
          {nameEditing ? (
            <Textarea
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
              variant="plain"
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
            <Badge className="gap-1.5 font-semibold" variant={currentBlock.isActive ? "success" : "neutral"}>
              {currentBlock.isActive ? <CheckCircle2 aria-hidden="true" size={13} /> : <PauseCircle aria-hidden="true" size={13} />}
              {currentBlock.isActive ? "Activo" : "Pausado"}
            </Badge>
            <Popover onOpenChange={setProjectOpen} open={projectOpen}>
              <PopoverTrigger asChild>
                <button
                  aria-label="Cambiar proyecto"
                  className={cn(
                    "inline-flex h-7 max-w-[13rem] cursor-pointer items-center gap-1.5 rounded-full border px-2.5 py-1 font-label-md text-label-md font-semibold leading-4 outline-none transition-colors disabled:cursor-wait disabled:opacity-60 focus-visible:ring-2 focus-visible:ring-primary/20",
                    selectedProject ? "border-transparent" : "border-outline-variant bg-surface-container-low text-on-surface-variant",
                  )}
                  disabled={pendingField !== null || projectsQuery.isLoading}
                  style={selectedProject ? {
                    backgroundColor: `color-mix(in srgb, ${selectedProject.color} 12%, transparent)`,
                    borderColor: selectedProject.color,
                    color: selectedProject.color,
                  } : undefined}
                  type="button"
                >
                  {selectedProject && <span aria-hidden="true" className="size-1.5 shrink-0 rounded-full" style={{ backgroundColor: selectedProject.color }} />}
                  <span className="min-w-0 truncate">{selectedProject?.name ?? "Sin proyecto"}</span>
                  <ChevronDown aria-hidden="true" className="size-3.5 shrink-0 text-on-surface-variant" />
                </button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-64 p-0">
                <Command>
                  <CommandInput placeholder="Buscar proyecto..." />
                  <CommandList>
                    <CommandEmpty>No encontramos ese proyecto.</CommandEmpty>
                    <CommandGroup heading="Proyectos">
                      <CommandItem onSelect={() => void selectProject(null)} value="sin proyecto">
                        <Check className={cn("size-4", currentBlock.projectId === null ? "opacity-100" : "opacity-0")} />
                        <span>Sin proyecto</span>
                      </CommandItem>
                      {projectOptions.map((option) => (
                        <CommandItem key={option.id} onSelect={() => void selectProject(option.id)} value={`${option.name} ${option.id}`}>
                          <Check className={cn("size-4", currentBlock.projectId === option.id ? "opacity-100" : "opacity-0")} />
                          <span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: option.color }} />
                          <span className="min-w-0 truncate">{option.name}</span>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
          </div>
        }
        footer={
          <div className="flex w-full gap-2.5">
            <Button
              className="h-12 flex-1 rounded-xl px-3 font-label-md text-label-md font-semibold text-on-surface-variant hover:text-on-surface"
              disabled={pendingField !== null || skipPending}
              onClick={() => void toggleActive()}
              type="button"
              variant="outline"
            >
              {currentBlock.isActive ? <PauseCircle aria-hidden="true" size={16} /> : <PlayCircle aria-hidden="true" size={16} />}
              {currentBlock.isActive ? "Pausar" : "Activar"}
            </Button>
            <Button
              className="h-12 flex-1 rounded-xl px-3 font-label-md text-label-md font-semibold"
              disabled={pendingField !== null || skipPending}
              onClick={() => onEdit(currentBlock)}
              type="button"
            >
              <Pencil aria-hidden="true" size={16} /> Editar bloque
            </Button>
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
              <div className="flex items-start justify-between gap-2">
                <Popover
                  onOpenChange={(open) => {
                    if (open) openScheduleEditor();
                    else if (scheduleEditing) cancelScheduleEditor();
                  }}
                  open={scheduleEditing}
                >
                  <PopoverTrigger asChild>
                    <button aria-label="Editar horario del bloque" className="min-w-0 flex-1 text-left" disabled={pendingField !== null} type="button">
                      <p className="font-label-caps text-label-caps uppercase text-on-surface-variant">{recurring ? "Horario habitual" : "Horario"}</p>
                      <div className="mt-0.5 flex flex-wrap items-center gap-2">
                        <span className="font-headline-md text-headline-md text-on-surface">{minToTime(currentBlock.startMin)} – {minToTime(currentBlock.endMin)}</span>
                        <Badge className="bg-primary-fixed text-primary" variant="neutral">{blockDuration(currentBlock)}</Badge>
                      </div>
                    </button>
                  </PopoverTrigger>
                  <PopoverContent align="end" className="w-[min(20rem,calc(100vw-2rem))]">
                    <div className="space-y-3">
                      <div>
                        <p className="font-label-caps text-label-caps uppercase text-on-surface-variant">Editar horario</p>
                        <p className="mt-0.5 font-body-sm text-body-sm text-on-surface-variant">Ajusta el bloque sin salir de la agenda.</p>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="block" htmlFor="time-block-preview-start">Inicio</Label>
                          <Input className="mt-1" data-vaul-no-drag disabled={pendingField !== null} id="time-block-preview-start" onChange={(event) => setScheduleDraft((current) => ({ ...current, startTime: event.target.value }))} type="time" value={scheduleDraft.startTime} />
                        </div>
                        <div>
                          <Label className="block" htmlFor="time-block-preview-end">Fin</Label>
                          <Input className="mt-1" data-vaul-no-drag disabled={pendingField !== null} id="time-block-preview-end" onChange={(event) => setScheduleDraft((current) => ({ ...current, endTime: event.target.value }))} type="time" value={scheduleDraft.endTime} />
                        </div>
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button className="h-10 min-h-0 rounded-lg px-3 font-label-md text-label-md text-on-surface-variant" disabled={pendingField !== null} onClick={cancelScheduleEditor} size="sm" type="button" variant="ghost">Cancelar</Button>
                        <Button className="h-10 min-h-0 rounded-lg px-3 font-label-md text-label-md font-semibold text-on-primary" disabled={pendingField !== null} onClick={() => void saveSchedule()} size="sm" type="button">Guardar</Button>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
                <Pencil aria-hidden="true" className="mt-1 shrink-0 text-on-surface-variant" size={14} />
              </div>
            </DetailRow>

            {recurring ? (
              <DetailRow divided icon={Repeat2}>
                <p className="font-label-caps text-label-caps uppercase text-on-surface-variant">Frecuencia</p>
                <p className="mt-0.5 font-body-sm text-body-sm text-on-surface-variant">{currentBlock.repeatEveryWeeks === 1 ? "Cada semana" : `Cada ${currentBlock.repeatEveryWeeks} semanas`}</p>
                <ToggleGroup
                  aria-label="Días de repetición"
                  className="mt-3 w-full"
                  disabled={pendingField !== null}
                  onValueChange={(values) => void saveDays(values)}
                  type="multiple"
                  value={orderedDays(currentBlock.daysOfWeek).map(String)}
                >
                  {DAY_ORDER.map((day) => (
                    <ToggleGroupItem aria-label={`Repetir los ${DAY_NAMES[day]}`} className="min-w-0 flex-1 px-1 font-label-caps text-[10px]" key={day} value={String(day)}>
                      {DAY_NAMES_SHORT[day]}
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>
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
              <Select disabled={pendingField !== null} onValueChange={(value) => void saveReminder(Number(value))} value={String(currentBlock.remindBeforeMin)}>
                <SelectTrigger aria-label="Cambiar recordatorio" className="h-9 max-w-[12rem] border-transparent bg-transparent px-1 font-body-md text-body-md font-semibold text-on-surface shadow-none hover:bg-surface-container-low" size="sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent align="end">
                  {reminderOptions(currentBlock.remindBeforeMin).map((option) => (
                    <SelectItem key={option.value} value={String(option.value)}>{option.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </DetailRow>

            {occurrenceDate && recurring && (
              <DetailRow divided icon={CalendarDays}>
                <p className="font-label-caps text-label-caps uppercase text-on-surface-variant">Ocurrencia seleccionada</p>
                <p className="mt-0.5 capitalize font-body-md text-body-md font-semibold text-on-surface">{blockDate(occurrenceDate)}</p>
              </DetailRow>
            )}
            </div>
          </section>

          {occurrenceKey && <TaskAssignmentPanel block={currentBlock} date={occurrenceKey} />}

          {occurrenceKey && onSkipDay && currentBlock.isActive && (
            <section className="border-t border-outline-variant pt-4">
              <Button
                className="min-h-11 w-full justify-center rounded-xl border-error/40 font-label-md text-label-md font-semibold text-error hover:bg-error-container/30"
                disabled={pendingField !== null || skipPending}
                onClick={() => setSkipConfirmOpen(true)}
                type="button"
                variant="outline"
              >
                <CalendarX aria-hidden="true" size={16} /> Saltar este día
              </Button>
              <p className="mt-2 text-center font-body-sm text-body-sm text-on-surface-variant">
                No se notificará ni contará como enfoque el {blockDate(occurrenceKey)}.
              </p>
            </section>
          )}
        </div>
      </PreviewSheet>

      {skipConfirmOpen && occurrenceDate && onSkipDay && (
        <ConfirmModal
          cancelLabel="Cancelar"
          confirmLabel="Saltar este día"
          danger
          loading={skipPending}
          message={<>¿Saltar este bloque el {blockDate(occurrenceDate)}? No se notificará ni contará como enfoque.</>}
          onClose={() => setSkipConfirmOpen(false)}
          onConfirm={() => void confirmSkip()}
          title="¿Saltar bloque este día?"
        />
      )}
    </>
  );
}
