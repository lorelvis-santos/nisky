"use client";

import { X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useProjectsQuery } from "@/features/projects/hooks/useProjects";
import { TimeBlockEditor } from "@/features/timeblocks/components/TimeBlockEditor";
import { useTimeBlockMutations } from "@/features/timeblocks/hooks/useTimeBlocks";
import type { CreateTimeBlockPayload } from "@/features/timeblocks/api/timeblocks";
import { useModalScrollLock } from "@/hooks/useModalScrollLock";
import type { Project, TimeBlock } from "@/types/entities";

export function ScheduleBlockModal({
  open,
  onClose,
  target,
}: {
  open: boolean;
  onClose: () => void;
  target?: TimeBlock | null;
}) {
  const [formKey, setFormKey] = useState(0);
  const projectsQuery = useProjectsQuery();
  const mutations = useTimeBlockMutations();
  const projects = projectsQuery.data ?? [];
  const defaultProject = projects.find((project) => project.isDefault);
  const busy = mutations.create.isPending || mutations.update.isPending || mutations.remove.isPending;

  if (!open) return null;
  return <ModalBody busy={busy} defaultProjectId={defaultProject?.id} formKey={target?.id ?? formKey} mutations={mutations} onClose={onClose} projects={projects} setFormKey={setFormKey} target={target ?? null} />;
}

function ModalBody({
  busy,
  defaultProjectId,
  formKey,
  mutations,
  onClose,
  projects,
  setFormKey,
  target,
}: {
  busy: boolean;
  defaultProjectId: string | undefined;
  formKey: number | string;
  mutations: ReturnType<typeof useTimeBlockMutations>;
  onClose: () => void;
  projects: Project[];
  setFormKey: (updater: (key: number) => number) => void;
  target: TimeBlock | null;
}) {
  useModalScrollLock();

  const save = async (data: CreateTimeBlockPayload) => {
    try {
      if (target) {
        await mutations.update.mutateAsync({ id: target.id, payload: data });
        toast.success("¡Listo, bloque actualizado!");
      } else {
        await mutations.create.mutateAsync(data);
        setFormKey((key) => key + 1);
        toast.success("¡Bloque de tiempo creado!");
      }
      onClose();
    } catch {
      toast.error("Ups, no pudimos guardar el bloque. Inténtalo de nuevo.");
    }
  };

  const remove = target
    ? async () => {
        try {
          await mutations.remove.mutateAsync(target.id);
          toast.success("Bloque eliminado");
          onClose();
        } catch {
          toast.error("Ups, no pudimos eliminar el bloque.");
        }
      }
    : async () => {};

  const toggleActive = target
    ? async () => {
        try {
          await mutations.update.mutateAsync({ id: target.id, payload: { isActive: !target.isActive } });
          toast.success(target.isActive ? "Bloque pausado" : "Bloque activado");
          onClose();
        } catch {
          toast.error("Ups, no pudimos actualizar el bloque.");
        }
      }
    : async () => {};

  return (
    <div aria-modal="true" className="fixed inset-0 z-50 flex items-end bg-on-surface/20 backdrop-blur-[1px] sm:items-center sm:justify-center sm:p-4" onClick={onClose} role="dialog">
      <div className="flex max-h-[85vh] w-full max-w-md flex-col border border-outline-variant bg-surface" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-outline-variant bg-surface-bright px-5 py-4">
          <h2 className="font-headline-xs text-headline-xs font-bold text-primary">{target ? "Editar bloque" : "Programar bloque"}</h2>
          <button aria-label="Cerrar" className="text-on-surface-variant hover:text-on-surface" onClick={onClose} type="button">
            <X size={19} />
          </button>
        </div>
        <div className="overflow-y-auto p-5" data-modal-scroll>
          <TimeBlockEditor
            busy={busy}
            defaultProjectId={defaultProjectId}
            key={target?.id ?? `schedule-${formKey}`}
            onDelete={remove}
            onSave={save}
            onToggleActive={toggleActive}
            projects={projects}
            target={target}
          />
        </div>
      </div>
    </div>
  );
}
