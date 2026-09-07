"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { CalendarX, Trash2 } from "lucide-react";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import type { Project, TimeBlock, TimeBlockException } from "@/types/entities";
import type { CreateTimeBlockPayload } from "../api/timeblocks";
import { DAY_NAMES, DAY_ORDER, minToTime, parseDateOnly, timeToMin } from "../lib/time";
import { useBlockExceptionsQuery, useTimeBlockMutations } from "../hooks/useTimeBlocks";

export function TimeBlockEditor({
  target,
  prefill,
  projects,
  busy,
  onSave,
  onToggleActive,
  onDelete,
  onSkipToday,
  initialSkipDate,
}: {
  target: TimeBlock | null;
  prefill?: {
    dayOfWeek: number;
    startMin: number;
    endMin: number;
    date?: string;
    oneOff?: boolean;
  };
  projects: Project[];
  busy: boolean;
  onSave: (data: CreateTimeBlockPayload) => Promise<void>;
  onToggleActive: () => Promise<void>;
  onDelete: () => Promise<void>;
  onSkipToday: (date: string) => Promise<void>;
  initialSkipDate?: string;
}) {
  const [name, setName] = useState(target?.name ?? "");
  const [projectId, setProjectId] = useState(target ? target.projectId ?? "" : "");
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>(target?.daysOfWeek ?? [prefill?.dayOfWeek ?? 1]);
  const [startTime, setStartTime] = useState(minToTime(target?.startMin ?? prefill?.startMin ?? 9 * 60));
  const [endTime, setEndTime] = useState(minToTime(target?.endMin ?? prefill?.endMin ?? 11 * 60));
  const [repeatEveryWeeks, setRepeatEveryWeeks] = useState(target?.repeatEveryWeeks ?? 1);
  const [repeatEndsAt, setRepeatEndsAt] = useState(target?.repeatEndsAt ? target.repeatEndsAt.slice(0, 10) : "");
  const [remindBeforeMin, setRemindBeforeMin] = useState(target?.remindBeforeMin ?? 0);
  const [oneOff, setOneOff] = useState(Boolean(target?.date || prefill?.oneOff));
  const [oneOffDate, setOneOffDate] = useState(target?.date?.slice(0, 10) ?? prefill?.date ?? "");
  const [skipConfirmOpen, setSkipConfirmOpen] = useState(false);
  const [exceptionToDelete, setExceptionToDelete] = useState<TimeBlockException | null>(null);

  const todayISO = (() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  })();
  const [skipDate, setSkipDate] = useState(initialSkipDate ?? todayISO);

  const previousSkipDateRef = useRef<string | null>(null);
  useEffect(() => {
    if (initialSkipDate && initialSkipDate !== previousSkipDateRef.current) {
      previousSkipDateRef.current = initialSkipDate;
      setSkipDate(initialSkipDate);
    }
  }, [initialSkipDate]);

  const exceptionsQuery = useBlockExceptionsQuery(target?.id ?? null);
  const exceptions = exceptionsQuery.data ?? [];
  const exceptionMutations = useTimeBlockMutations();

  const previousTargetRef = useRef<TimeBlock | null>(target);
  useEffect(() => {
    const previous = previousTargetRef.current;
    previousTargetRef.current = target;
    if (!target || !previous) return;
    if (target.startMin !== previous.startMin) setStartTime(minToTime(target.startMin));
    if (target.endMin !== previous.endMin) setEndTime(minToTime(target.endMin));
    if (JSON.stringify(target.daysOfWeek) !== JSON.stringify(previous.daysOfWeek)) setDaysOfWeek(target.daysOfWeek);
  }, [target]);

  const toggleDay = (day: number) => {
    setDaysOfWeek((current) => {
      if (current.includes(day)) {
        if (current.length === 1) return current;
        return current.filter((value) => value !== day);
      }
      return [...current, day];
    });
  };

  const changeOneOffDate = (value: string) => {
    setOneOffDate(value);
    const next = parseDateOnly(value);
    if (!Number.isNaN(next.getTime())) setDaysOfWeek([next.getDay()]);
  };

  const save = async () => {
    if (oneOff && !oneOffDate) {
      toast.error("Selecciona la fecha del bloque.");
      return;
    }
    const startMin = timeToMin(startTime);
    const endMin = timeToMin(endTime);
    if (endMin - startMin < 5) {
      toast.error("El bloque debe durar al menos 5 minutos.");
      return;
    }
    await onSave({
      name: name.trim() || undefined,
      projectId: projectId || null,
      date: oneOff ? oneOffDate || null : null,
      daysOfWeek: [...daysOfWeek].sort((a, b) => a - b),
      startMin,
      endMin,
      repeatEveryWeeks: oneOff ? 1 : repeatEveryWeeks,
      repeatEndsAt: oneOff ? null : repeatEndsAt || null,
      remindBeforeMin,
    });
  };

  const formatExceptionDate = (dateStr: string) => {
    const date = parseDateOnly(dateStr);
    if (Number.isNaN(date.getTime())) return dateStr;
    return date.toLocaleDateString("es", { weekday: "short", day: "numeric", month: "short" });
  };

  const handleDeleteException = async () => {
    if (!exceptionToDelete || !target) return;
    try {
      await exceptionMutations.deleteException.mutateAsync({ blockId: target.id, exceptionId: exceptionToDelete.id });
      toast.success("Excepción eliminada");
    } catch {
      toast.error("No se pudo eliminar la excepción");
    }
    setExceptionToDelete(null);
  };

  return (
    <div className="space-y-3">
      <label className="block">
        <span className="font-label-md text-label-md text-on-surface-variant">Proyecto</span>
        <select className="field mt-1" onChange={(event) => setProjectId(event.target.value)} value={projectId}>
          <option value="">Sin proyecto (tiempo libre)</option>
          {projects.map((project) => (
            <option key={project.id} value={project.id}>{project.name}</option>
          ))}
        </select>
      </label>
      {oneOff ? (
        <label className="block">
          <span className="font-label-md text-label-md text-on-surface-variant">Fecha</span>
          <input className="field mt-1 min-h-11" onChange={(event) => changeOneOffDate(event.target.value)} type="date" value={oneOffDate} />
        </label>
      ) : (
        <div>
          <span className="font-label-md text-label-md text-on-surface-variant">Días</span>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {DAY_ORDER.map((day) => (
              <button
                aria-pressed={daysOfWeek.includes(day)}
                className={`min-h-11 min-w-[64px] rounded-md border px-3 py-1.5 font-body-sm text-body-sm transition-colors ${daysOfWeek.includes(day) ? "border-primary bg-primary text-on-primary" : "border-outline-variant bg-surface hover:bg-surface-container-low hover:text-secondary"}`}
                key={day}
                onClick={() => toggleDay(day)}
                type="button"
              >
                {DAY_NAMES[day]}
              </button>
            ))}
          </div>
        </div>
      )}
      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="font-label-md text-label-md text-on-surface-variant">Inicio</span>
          <input className="field mt-1 min-h-11" onChange={(event) => setStartTime(event.target.value)} type="time" value={startTime} />
        </label>
        <label className="block">
          <span className="font-label-md text-label-md text-on-surface-variant">Fin</span>
          <input className="field mt-1 min-h-11" onChange={(event) => setEndTime(event.target.value)} type="time" value={endTime} />
        </label>
      </div>
      <label className="block">
        <span className="font-label-md text-label-md text-on-surface-variant">Nombre (opcional)</span>
        <input className="field mt-1" onChange={(event) => setName(event.target.value)} placeholder="Ej: estudio ITLA" value={name} />
      </label>
      <label className="block">
        <span className="font-label-md text-label-md text-on-surface-variant">Avisar antes</span>
        <select className="field mt-1" onChange={(event) => setRemindBeforeMin(Number(event.target.value))} value={remindBeforeMin}>
          <option value={0}>Sin aviso previo</option>
          <option value={5}>5 minutos antes</option>
          <option value={10}>10 minutos antes</option>
          <option value={15}>15 minutos antes</option>
          <option value={30}>30 minutos antes</option>
          <option value={60}>1 hora antes</option>
        </select>
      </label>
      <section className="border-t border-outline-variant pt-3">
        <span className="font-label-md text-label-md text-on-surface-variant">Tipo de bloque</span>
        {prefill?.oneOff || target?.date ? (
          <div className="mt-2 flex flex-wrap gap-1.5">
            <button
              aria-pressed={oneOff}
              className={`min-h-11 rounded-md border px-3 py-1.5 font-body-sm text-body-sm transition-colors ${oneOff ? "border-primary bg-primary text-on-primary" : "border-outline-variant bg-surface hover:bg-surface-container-low hover:text-secondary"}`}
              onClick={() => {
                setOneOff(true);
                setRepeatEveryWeeks(1);
              }}
              type="button"
            >
              Solo este día
            </button>
            <button
              aria-pressed={!oneOff}
              className={`min-h-11 rounded-md border px-3 py-1.5 font-body-sm text-body-sm transition-colors ${!oneOff ? "border-primary bg-primary text-on-primary" : "border-outline-variant bg-surface hover:bg-surface-container-low hover:text-secondary"}`}
              onClick={() => {
                setOneOff(false);
                setRepeatEndsAt("");
              }}
              type="button"
            >
              Repetir
            </button>
          </div>
        ) : null}
        {oneOff ? (
          <p className="mt-2 font-body-sm text-body-sm text-on-surface-variant">Se reserva únicamente para la fecha seleccionada.</p>
        ) : (
          <>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {[
                [1, "Cada semana"],
                [2, "Cada 2 semanas"],
                [3, "Cada 3 semanas"],
                [4, "Cada 4 semanas"],
              ].map(([weeks, label]) => (
                <button
                  className={`min-h-11 rounded-md border px-3 py-1.5 font-body-sm text-body-sm transition-colors ${repeatEveryWeeks === weeks ? "border-primary bg-primary text-on-primary" : "border-outline-variant bg-surface hover:bg-surface-container-low hover:text-secondary"}`}
                  key={weeks}
                  onClick={() => setRepeatEveryWeeks(weeks as number)}
                  type="button"
                >
                  {label}
                </button>
              ))}
            </div>
            <label className="mt-3 block">
              <span className="font-label-md text-label-md text-on-surface-variant">Hasta (opcional)</span>
              <input
                className="field mt-1 min-h-11"
                onChange={(event) => setRepeatEndsAt(event.target.value)}
                type="date"
                value={repeatEndsAt}
              />
            </label>
          </>
        )}
      </section>
      <button
        className="flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 font-body-sm text-body-sm text-on-primary shadow-cadence-1 transition-colors hover:bg-primary/90 disabled:opacity-50"
        disabled={busy}
        onClick={() => void save()}
        type="button"
      >
        {target ? "Guardar cambios" : "Guardar bloque"}
      </button>
      {target && (
        <div className="flex items-center justify-between gap-2 border-t border-outline-variant pt-3">
          <button
            className={`min-h-11 flex-1 whitespace-nowrap rounded-md border border-outline-variant bg-surface px-3 py-2 font-body-sm text-body-sm transition-colors hover:bg-surface-container-low disabled:opacity-50 ${target.isActive ? "" : "border-primary bg-primary text-on-primary"}`}
            disabled={busy}
            onClick={() => void onToggleActive()}
            type="button"
          >
            {target.isActive ? "Pausar" : "Activar"}
          </button>
          <button
            className="min-h-11 flex-1 whitespace-nowrap rounded-md border border-error bg-surface px-3 py-2 font-body-sm text-body-sm text-error transition-colors hover:bg-error-container/30 disabled:opacity-50"
            disabled={busy}
            onClick={() => void onDelete()}
            type="button"
          >
            Eliminar
          </button>
        </div>
      )}
      {target && target.isActive && (
        <div className="flex items-end gap-2 border-t border-outline-variant pt-3">
          <label className="flex-1">
            <span className="font-label-md text-label-md text-on-surface-variant">Saltar un día</span>
            <input
              className="field mt-1 min-h-11"
              min="2000-01-01"
              onChange={(event) => setSkipDate(event.target.value)}
              type="date"
              value={skipDate}
            />
          </label>
          <button
            className="min-h-11 flex-1 whitespace-nowrap rounded-md border border-outline-variant bg-surface px-3 py-2 font-body-sm text-body-sm text-on-surface-variant transition-colors hover:bg-surface-container-low hover:text-error disabled:opacity-50"
            disabled={busy || !skipDate}
            onClick={() => setSkipConfirmOpen(true)}
            type="button"
          >
            <CalendarX className="mr-1 inline" size={15} /> Saltar
          </button>
        </div>
      )}
      {target && exceptions.length > 0 && (
        <div className="border-t border-outline-variant pt-3">
          <span className="font-label-md text-label-md text-on-surface-variant">Excepciones ({exceptions.length})</span>
          <ul className="mt-2 flex flex-col divide-y divide-outline-variant">
            {exceptions.map((exc) => (
              <li className="flex items-center justify-between gap-2 py-2" key={exc.id}>
                <div className="min-w-0">
                  <p className="truncate font-body-sm text-body-sm text-on-surface">{formatExceptionDate(exc.date)}</p>
                  <p className="font-data-mono text-data-mono text-[10px] text-on-surface-variant">
                    {exc.action === "skip"
                      ? "Saltado"
                      : `Movido a ${exc.startMin !== null ? minToTime(exc.startMin) : ""}–${exc.endMin !== null ? minToTime(exc.endMin) : ""}`}
                  </p>
                </div>
                <button
                  aria-label="Eliminar excepción"
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-on-surface-variant transition-colors hover:bg-error-container/40 hover:text-error"
                  disabled={busy}
                  onClick={() => setExceptionToDelete(exc)}
                  type="button"
                >
                  <Trash2 size={15} />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
      {skipConfirmOpen && target && (
        <ConfirmModal
          cancelLabel="Cancelar"
          confirmLabel={skipDate === todayISO ? "Saltar hoy" : "Saltar este día"}
          danger
          loading={busy}
          message={<>¿Saltar este bloque el {skipDate === todayISO ? "día de hoy" : `día ${formatExceptionDate(skipDate)}`}? No se notificará ni contará como enfoque.</>}
          onClose={() => setSkipConfirmOpen(false)}
          onConfirm={async () => {
            setSkipConfirmOpen(false);
            await onSkipToday(skipDate);
          }}
          title={skipDate === todayISO ? "¿Saltar bloque hoy?" : "¿Saltar bloque este día?"}
        />
      )}
      {exceptionToDelete && (
        <ConfirmModal
          cancelLabel="Cancelar"
          confirmLabel="Eliminar"
          danger
          loading={busy}
          message={<>¿Eliminar la excepción del {formatExceptionDate(exceptionToDelete.date)}? El bloque volverá a su horario normal ese día.</>}
          onClose={() => setExceptionToDelete(null)}
          onConfirm={() => void handleDeleteException()}
          title="¿Eliminar excepción?"
        />
      )}
    </div>
  );
}
