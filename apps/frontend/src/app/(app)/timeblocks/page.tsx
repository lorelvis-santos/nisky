"use client";

import { CalendarClock, Plus, SlidersHorizontal, X } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useProjectsQuery } from "@/features/projects/hooks/useProjects";
import { TimeBlockEditor } from "@/features/timeblocks/components/TimeBlockEditor";
import { TimeBlockWeekGrid } from "@/features/timeblocks/components/TimeBlockWeekGrid";
import {
  useTimeBlockMutations,
  useTimeBlockSettingsMutation,
  useTimeBlockSettingsQuery,
  useTimeBlocksQuery,
} from "@/features/timeblocks/hooks/useTimeBlocks";
import { minToTime, timeToMin } from "@/features/timeblocks/lib/time";
import type { CreateTimeBlockPayload } from "@/features/timeblocks/api/timeblocks";
import { useModalScrollLock } from "@/hooks/useModalScrollLock";
import { useIsMobile } from "@/hooks/useIsMobile";
import type { TimeBlock } from "@/types/entities";

type SlotPrefill = { dayOfWeek: number; startMin: number; endMin: number };

function MobileEditorModal({
  children,
  title,
  onClose,
}: {
  children: React.ReactNode;
  title: string;
  onClose: () => void;
}) {
  useModalScrollLock();
  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-[60] flex items-end bg-on-surface/20 backdrop-blur-[1px] sm:items-center sm:justify-center sm:p-4 lg:hidden"
      role="dialog"
    >
      <div className="flex max-h-[85vh] w-full md:max-w-md flex-col border border-outline-variant bg-surface">
        <div className="flex items-center justify-between border-b border-outline-variant bg-surface-bright px-5 py-4">
          <h2 className="font-headline-xs text-headline-xs font-bold text-primary">
            {title}
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
        <div className="overflow-y-auto p-5" data-modal-scroll>
          {children}
        </div>
      </div>
    </div>
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
  const defaultProject = projects.find((project) => project.isDefault);
  const isMobile = useIsMobile(1023);
  const blocks = query.data ?? [];
  const [editing, setEditing] = useState<TimeBlock | null>(null);
  const [prefill, setPrefill] = useState<SlotPrefill | null>(null);
  const [formKey, setFormKey] = useState(0);
  const [mobileFormOpen, setMobileFormOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [dayStartTime, setDayStartTime] = useState("06:00");
  const [dayEndTime, setDayEndTime] = useState("23:00");
  const settingsBusy = settingsMutation.isPending;

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

  const activeBlocks = blocks.filter((block) => block.isActive);
  const reservedHours =
    activeBlocks.reduce(
      (acc, block) => acc + (block.endMin - block.startMin),
      0,
    ) / 60;
  const busy =
    mutations.create.isPending ||
    mutations.update.isPending ||
    mutations.remove.isPending;

  const createAtSlot = async (dayOfWeek: number, startMin: number) => {
    try {
      await mutations.create.mutateAsync({
        dayOfWeek,
        startMin,
        endMin: Math.min(startMin + 60, 24 * 60),
        projectId: defaultProject?.id,
      });
      toast.success("Bloque creado. Arrastra sus bordes para ajustarlo.");
    } catch {
      toast.error("Ups, no pudimos crear el bloque. Inténtalo de nuevo.");
    }
  };

  const openBlock = (block: TimeBlock) => {
    setEditing(block);
    setPrefill(null);
    if (isMobile) setMobileFormOpen(true);
  };

  useEffect(() => {
    if (blocks.length === 0) return;
    const now = new Date();
    const nowMin = now.getHours() * 60 + now.getMinutes();
    const today = now.getDay();
    const current = blocks.find(
      (block) =>
        block.isActive &&
        block.dayOfWeek === today &&
        block.startMin <= nowMin &&
        nowMin < block.endMin,
    );
    if (current) {
      setEditing(current);
      setPrefill(null);
    }
  }, [blocks.length]);

  const resizeBlock = async (block: TimeBlock, startMin: number, endMin: number, dayOfWeek: number) => {
    if (startMin === block.startMin && endMin === block.endMin && dayOfWeek === block.dayOfWeek) return;
    try {
      await mutations.update.mutateAsync({
        id: block.id,
        payload: { startMin, endMin, dayOfWeek },
      });
    } catch {
      toast.error("Ups, no pudimos ajustar el bloque. Inténtalo de nuevo.");
    }
  };

  const closeEditor = () => {
    setEditing(null);
    setPrefill(null);
    setMobileFormOpen(false);
  };

  const save = async (data: CreateTimeBlockPayload) => {
    try {
      if (editing) {
        await mutations.update.mutateAsync({ id: editing.id, payload: data });
        setEditing(null);
        toast.success("¡Listo, bloque actualizado!");
      } else {
        await mutations.create.mutateAsync(data);
        setPrefill(null);
        setFormKey((key) => key + 1);
        toast.success("¡Bloque de tiempo creado!");
      }
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

  const editor = (
    <TimeBlockEditor
      busy={busy}
      defaultProjectId={defaultProject?.id}
      key={editing?.id ?? `create-${formKey}-${prefill?.dayOfWeek ?? ""}-${prefill?.startMin ?? ""}-${prefill?.endMin ?? ""}`}
      onDelete={remove}
      onSave={save}
      onToggleActive={toggleActive}
      prefill={prefill ?? undefined}
      projects={projects}
      target={editing}
    />
  );

  return (
    <section className="h-full overflow-y-auto bg-background p-container-padding sm:p-section-gap">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3 border-b border-outline-variant pb-4">
        <div>
          <p className="font-label-caps text-label-caps uppercase text-on-surface-variant">
            TU AGENDA SEMANAL
          </p>
          <h1 className="mt-1 font-headline-sm text-headline-sm text-primary">
            Bloques de tiempo
          </h1>
          <p className="mt-1 font-body-sm text-body-sm text-on-surface-variant">
            Reserva horas para tus proyectos. El enfoque activo las usa para
            decirte qué toca ahora.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            aria-label="Ajustar rango del día"
            className="flex items-center gap-2 border border-outline-variant bg-surface-container-lowest px-3 py-1.5 font-data-mono text-data-mono text-xs text-on-surface-variant hover:border-primary hover:text-primary"
            onClick={openSettings}
            type="button"
          >
            <SlidersHorizontal size={14} />
            {minToTime(settings?.dayStartMin ?? 6 * 60)} – {minToTime(settings?.dayEndMin ?? 23 * 60)}
          </button>
          <span className="flex items-center gap-2 border border-outline-variant bg-surface-container-lowest px-3 py-1.5 font-data-mono text-data-mono text-xs text-primary">
            <CalendarClock size={14} />
            {reservedHours.toFixed(1)}h reservadas
          </span>
          <span className="border border-outline-variant bg-surface-container-lowest px-3 py-1.5 font-data-mono text-data-mono text-xs text-on-surface-variant">
            {activeBlocks.length}{" "}
            {activeBlocks.length === 1 ? "bloque" : "bloques"}
          </span>
        </div>
      </div>

      {settingsOpen && (
        <div className="mb-6 border border-outline-variant bg-surface-container-lowest p-4">
          <p className="font-label-caps text-label-caps uppercase text-on-surface-variant">
            RANGO DEL DÍA
          </p>
          <p className="mt-1 font-body-sm text-body-sm text-on-surface-variant">
            Define las horas visibles en tu agenda semanal.
          </p>
          <div className="mt-3 grid max-w-md grid-cols-2 gap-3">
            <label className="block">
              <span className="font-label-caps text-label-caps text-on-surface-variant">INICIO</span>
              <input
                className="field mt-1"
                onChange={(event) => setDayStartTime(event.target.value)}
                type="time"
                value={dayStartTime}
              />
            </label>
            <label className="block">
              <span className="font-label-caps text-label-caps text-on-surface-variant">FIN</span>
              <input
                className="field mt-1"
                onChange={(event) => setDayEndTime(event.target.value)}
                type="time"
                value={dayEndTime}
              />
            </label>
          </div>
          <button
            className="mt-3 flex items-center justify-center gap-2 bg-primary-container px-4 py-2 font-body-sm text-body-sm text-on-primary hover:bg-primary disabled:opacity-50"
            disabled={settingsBusy}
            onClick={() => void saveDayRange()}
            type="button"
          >
            Guardar rango
          </button>
        </div>
      )}

      <div className="flex items-start gap-4">
        <div className="min-w-0 flex-1 border border-outline-variant bg-surface-container-lowest">
          <TimeBlockWeekGrid
            blocks={blocks}
            dayEndMin={settings?.dayEndMin ?? 23 * 60}
            dayStartMin={settings?.dayStartMin ?? 6 * 60}
            moveEnabled={!isMobile}
            onBlockClick={openBlock}
            onResize={resizeBlock}
            onSlotClick={createAtSlot}
            projects={projects}
          />
        </div>
        <aside className="hidden w-[20rem] shrink-0 flex-col border border-outline-variant bg-surface-container-lowest lg:flex">
          <div className="flex items-center justify-between gap-2 border-b border-outline-variant bg-surface-container-low px-4 py-3">
            <h2 className="font-headline-xs text-headline-xs">
              {editing ? "Editar bloque" : "Nuevo bloque"}
            </h2>
            {editing && (
              <button
                aria-label="Nuevo bloque"
                className="text-on-surface-variant hover:text-primary"
                onClick={() => closeEditor()}
                type="button"
              >
                <Plus size={16} />
              </button>
            )}
          </div>
          <div className="flex-1 overflow-y-auto p-4">{editor}</div>
        </aside>
      </div>

      <button
        aria-label="Nuevo bloque de tiempo"
        className="fixed bottom-6 right-6 z-40 flex h-12 w-12 items-center justify-center border border-outline-variant bg-primary text-on-primary hover:bg-primary-container hover:text-on-primary-container lg:hidden"
        onClick={() => {
          setEditing(null);
          setPrefill(null);
          setMobileFormOpen(true);
        }}
        type="button"
      >
        <Plus size={22} />
      </button>

      {mobileFormOpen && (
        <MobileEditorModal
          onClose={closeEditor}
          title={editing ? "Editar bloque" : "Nuevo bloque"}
        >
          {editor}
        </MobileEditorModal>
      )}
    </section>
  );
}

export default function TimeBlocksPage() {
  return <TimeBlocksContent />;
}
