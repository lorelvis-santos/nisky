"use client";

import { ArchiveRestore, Trash2, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import type { QuickNote } from "@/types/entities";
import { formatCreatedAt } from "@/lib/utils";
import { useQuickNoteMutations, useQuickNotesQuery } from "../hooks/useQuickNotes";

export function QuickNoteManager({ onClose }: { onClose: () => void }) {
  const query = useQuickNotesQuery("ARCHIVED");
  const mutations = useQuickNoteMutations();
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const restore = async (note: QuickNote) => {
    try {
      await mutations.update.mutateAsync({ id: note.id, payload: { status: "INBOX" } });
      toast.success("Captura restaurada");
    } catch {
      toast.error("No se pudo restaurar la captura");
    }
  };

  const remove = async (note: QuickNote) => {
    if (deleteId !== note.id) {
      setDeleteId(note.id);
      return;
    }
    try {
      await mutations.remove.mutateAsync(note.id);
      setDeleteId(null);
      toast.success("Captura eliminada");
    } catch {
      toast.error("No se pudo eliminar la captura");
    }
  };

  const notes = query.data ?? [];

  return (
    <div aria-modal="true" className="fixed inset-0 z-[60] flex items-center justify-center bg-on-surface/20 p-4 backdrop-blur-[1px]" role="dialog">
      <div className="flex max-h-[90vh] w-full max-w-lg flex-col border border-outline-variant bg-surface">
        <div className="flex items-center justify-between border-b border-outline-variant bg-surface-bright px-5 py-4">
          <div>
            <p className="font-label-caps text-label-caps uppercase text-on-surface-variant">BANDEJA</p>
            <h2 className="mt-1 font-headline-xs text-headline-xs font-bold text-primary">Capturas archivadas</h2>
          </div>
          <button aria-label="Cerrar" className="text-on-surface-variant hover:text-on-surface" onClick={onClose} type="button"><X size={19} /></button>
        </div>
        <div className="overflow-y-auto p-5">
          {query.isLoading ? <p className="font-body-sm text-body-sm text-on-surface-variant">Cargando capturas...</p> : query.isError ? <p className="font-body-sm text-body-sm text-error">No se pudieron cargar las capturas archivadas.</p> : notes.length === 0 ? <p className="font-body-sm text-body-sm text-on-surface-variant">No hay capturas archivadas.</p> : (
            <div className="divide-y divide-outline-variant border-y border-outline-variant">
              {notes.filter((note) => note.status === "ARCHIVED").map((note) => (
                <div className="py-3" key={note.id}>
                  <p className="font-body-sm text-body-sm text-on-surface">{note.content}</p>
                  <p className="mt-1 font-data-mono text-data-mono text-xs text-on-surface-variant">Creada {formatCreatedAt(note.createdAt)}</p>
                  <div className="mt-2 flex items-center gap-3">
                    <button className="flex items-center gap-1 font-body-sm text-body-sm text-primary hover:underline" onClick={() => void restore(note)} type="button"><ArchiveRestore size={14} /> Restaurar</button>
                    <button aria-label={`Eliminar ${note.content}`} className={`flex items-center gap-1 font-body-sm text-body-sm ${deleteId === note.id ? "bg-error px-2 py-1 text-error-foreground" : "text-on-surface-variant hover:text-error"}`} onClick={() => void remove(note)} type="button"><Trash2 className={deleteId === note.id ? "text-on-primary" : undefined} size={14} />{deleteId === note.id ? "Confirmar" : "Eliminar"}</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="flex justify-end border-t border-outline-variant bg-surface-container-low px-5 py-4"><button className="border border-outline-variant px-4 py-2 font-body-sm text-body-sm hover:bg-surface-container-high" onClick={onClose} type="button">Cerrar</button></div>
      </div>
    </div>
  );
}
