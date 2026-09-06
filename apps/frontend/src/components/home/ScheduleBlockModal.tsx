"use client";

import { X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useProjectsQuery } from "@/features/projects/hooks/useProjects";
import { TimeBlockEditor } from "@/features/timeblocks/components/TimeBlockEditor";
import { useTimeBlockMutations } from "@/features/timeblocks/hooks/useTimeBlocks";
import type { CreateTimeBlockPayload } from "@/features/timeblocks/api/timeblocks";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  const busy = mutations.create.isPending || mutations.update.isPending || mutations.remove.isPending;

  if (!open) return null;
  return <ModalBody busy={busy} formKey={target?.id ?? formKey} mutations={mutations} onClose={onClose} projects={projects} setFormKey={setFormKey} target={target ?? null} />;
}

function ModalBody({
  busy,
  formKey,
  mutations,
  onClose,
  projects,
  setFormKey,
  target,
}: {
  busy: boolean;
  formKey: number | string;
  mutations: ReturnType<typeof useTimeBlockMutations>;
  onClose: () => void;
  projects: Project[];
  setFormKey: (updater: (key: number) => number) => void;
  target: TimeBlock | null;
}) {
  const save = async (data: CreateTimeBlockPayload) => {
    try {
      if (target) {
        await mutations.update.mutateAsync({ id: target.id, payload: data });
        toast.success("¡Listo, bloque actualizado!");
      } else {
        await mutations.create.mutateAsync(data);
        setFormKey((key) => key + 1);
        toast.success("¡Bloque creado!");
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
    <Dialog open onOpenChange={(nextOpen) => { if (!nextOpen) onClose(); }}>
      <DialogContent className="top-auto bottom-0 flex h-[min(85dvh,42rem)] max-h-[85dvh] w-full max-w-md translate-y-0 flex-col gap-0 overflow-hidden rounded-t-lg rounded-b-none border-outline-variant bg-surface p-0 sm:top-1/2 sm:bottom-auto sm:h-auto sm:max-h-[85vh] sm:-translate-y-1/2 sm:rounded-lg" data-keyboard-sheet showCloseButton={false}>
        <DialogHeader className="flex shrink-0 flex-row items-center justify-between border-b border-outline-variant bg-surface-bright px-5 py-4 text-left">
          <DialogTitle className="font-headline-xs text-headline-xs font-bold normal-case tracking-normal text-primary">{target ? "Editar bloque" : "Programar bloque"}</DialogTitle>
          <DialogDescription className="sr-only">Configura el horario de un bloque de tiempo.</DialogDescription>
          <DialogClose asChild>
             <button aria-label="Cerrar" className="flex h-10 w-10 items-center justify-center rounded-md text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface" type="button">
              <X size={19} />
            </button>
          </DialogClose>
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-y-auto p-5" data-modal-scroll>
          <TimeBlockEditor
            busy={busy}
            key={target?.id ?? `schedule-${formKey}`}
            onDelete={remove}
            onSave={save}
            onSkipToday={async (date: string) => {
              if (!target) return;
              try {
                await mutations.createException.mutateAsync({
                  id: target.id,
                  date,
                  action: "skip",
                });
                toast.success("Bloque saltado ese día");
                onClose();
              } catch (err) {
                toast.error((err as { message?: string })?.message ?? "Ups, no pudimos saltar el bloque.");
              }
            }}
            onToggleActive={toggleActive}
            projects={projects}
            target={target}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
