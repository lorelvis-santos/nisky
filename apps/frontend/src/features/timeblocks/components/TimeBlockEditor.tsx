"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { Project, TimeBlock } from "@/types/entities";
import type { CreateTimeBlockPayload } from "../api/timeblocks";
import { DAY_NAMES, minToTime, timeToMin } from "../lib/time";

export function TimeBlockEditor({
  target,
  prefill,
  defaultProjectId,
  projects,
  busy,
  onSave,
  onToggleActive,
  onDelete,
}: {
  target: TimeBlock | null;
  prefill?: { dayOfWeek: number; startMin: number; endMin: number };
  defaultProjectId: string | undefined;
  projects: Project[];
  busy: boolean;
  onSave: (data: CreateTimeBlockPayload) => Promise<void>;
  onToggleActive: () => Promise<void>;
  onDelete: () => Promise<void>;
}) {
  const [name, setName] = useState(target?.name ?? "");
  const [projectId, setProjectId] = useState(target?.projectId ?? defaultProjectId ?? "");
  const [dayOfWeek, setDayOfWeek] = useState(target?.dayOfWeek ?? prefill?.dayOfWeek ?? 1);
  const [startTime, setStartTime] = useState(minToTime(target?.startMin ?? prefill?.startMin ?? 9 * 60));
  const [endTime, setEndTime] = useState(minToTime(target?.endMin ?? prefill?.endMin ?? 11 * 60));
  const [repeatEveryWeeks, setRepeatEveryWeeks] = useState(target?.repeatEveryWeeks ?? 1);
  const [repeatEndsAt, setRepeatEndsAt] = useState(target?.repeatEndsAt ? target.repeatEndsAt.slice(0, 10) : "");
  const [remindBeforeMin, setRemindBeforeMin] = useState(target?.remindBeforeMin ?? 0);

  const previousTargetRef = useRef<TimeBlock | null>(target);
  useEffect(() => {
    const previous = previousTargetRef.current;
    previousTargetRef.current = target;
    if (!target || !previous) return;
    if (target.startMin !== previous.startMin) setStartTime(minToTime(target.startMin));
    if (target.endMin !== previous.endMin) setEndTime(minToTime(target.endMin));
    if (target.dayOfWeek !== previous.dayOfWeek) setDayOfWeek(target.dayOfWeek);
  }, [target]);

  const save = async () => {
    const startMin = timeToMin(startTime);
    const endMin = timeToMin(endTime);
    if (endMin <= startMin) {
      toast.error("La hora de fin debe ser mayor a la de inicio.");
      return;
    }
    await onSave({
      name: name.trim() || undefined,
      projectId: projectId || undefined,
      dayOfWeek,
      startMin,
      endMin,
      repeatEveryWeeks,
      repeatEndsAt: repeatEndsAt || null,
      remindBeforeMin,
    });
  };

  return (
    <div className="space-y-3">
      <label className="block">
        <span className="font-label-caps text-label-caps text-on-surface-variant">PROYECTO</span>
        <select className="field mt-1" onChange={(event) => setProjectId(event.target.value)} value={projectId}>
          <option value="">Sin proyecto (tiempo libre)</option>
          {projects.map((project) => (
            <option key={project.id} value={project.id}>{project.name}</option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className="font-label-caps text-label-caps text-on-surface-variant">DÍA</span>
        <select className="field mt-1" onChange={(event) => setDayOfWeek(Number(event.target.value))} value={dayOfWeek}>
          {DAY_NAMES.map((day, index) => (
            <option key={day} value={index}>{day}</option>
          ))}
        </select>
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="font-label-caps text-label-caps text-on-surface-variant">INICIO</span>
          <input className="field mt-1" onChange={(event) => setStartTime(event.target.value)} type="time" value={startTime} />
        </label>
        <label className="block">
          <span className="font-label-caps text-label-caps text-on-surface-variant">FIN</span>
          <input className="field mt-1" onChange={(event) => setEndTime(event.target.value)} type="time" value={endTime} />
        </label>
      </div>
      <label className="block">
        <span className="font-label-caps text-label-caps text-on-surface-variant">NOMBRE (OPCIONAL)</span>
        <input className="field mt-1" onChange={(event) => setName(event.target.value)} placeholder="Ej: estudio ITLA" value={name} />
      </label>
      <label className="block">
        <span className="font-label-caps text-label-caps text-on-surface-variant">AVISAR ANTES</span>
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
        <span className="font-label-caps text-label-caps text-on-surface-variant">REPETIR</span>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {[
            [0, "No repetir"],
            [1, "Cada semana"],
            [2, "Cada 2 semanas"],
            [3, "Cada 3 semanas"],
            [4, "Cada 4 semanas"],
          ].map(([weeks, label]) => (
            <button
              className={`border px-3 py-1.5 font-body-sm text-body-sm ${repeatEveryWeeks === weeks ? "bg-primary-container text-on-primary" : "border-outline-variant hover:bg-surface-container-low hover:text-primary"}`}
              key={weeks}
              onClick={() => setRepeatEveryWeeks(weeks as number)}
              type="button"
            >
              {label}
            </button>
          ))}
        </div>
        <label className="mt-3 block">
          <span className="font-label-caps text-label-caps text-on-surface-variant">HASTA (OPCIONAL)</span>
          <input
            className="field mt-1"
            onChange={(event) => setRepeatEndsAt(event.target.value)}
            type="date"
            value={repeatEndsAt}
          />
        </label>
      </section>
      <button
        className="flex w-full items-center justify-center gap-2 bg-primary-container px-4 py-2 font-body-sm text-body-sm text-on-primary hover:bg-primary disabled:opacity-50"
        disabled={busy}
        onClick={() => void save()}
        type="button"
      >
        {target ? "Guardar cambios" : "Guardar bloque"}
      </button>
      {target && (
        <div className="flex items-center justify-between gap-2 border-t border-outline-variant pt-3">
          <button
            className={`flex-1 whitespace-nowrap border border-outline-variant px-3 py-2 font-body-sm text-body-sm hover:bg-surface-container-high disabled:opacity-50 ${target.isActive ? "" : "bg-primary-container text-on-primary"}`}
            disabled={busy}
            onClick={() => void onToggleActive()}
            type="button"
          >
            {target.isActive ? "Pausar" : "Activar"}
          </button>
          <button
            className="flex-1 whitespace-nowrap border border-outline-variant px-3 py-2 font-body-sm text-body-sm text-error hover:bg-error-container/30 disabled:opacity-50"
            disabled={busy}
            onClick={() => void onDelete()}
            type="button"
          >
            Eliminar
          </button>
        </div>
      )}
    </div>
  );
}
