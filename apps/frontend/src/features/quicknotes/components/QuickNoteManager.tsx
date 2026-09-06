"use client";

import { ArchiveRestore, Trash2, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { QuickNote } from "@/types/entities";
import { formatCreatedAt } from "@/lib/utils";
import { useQuickNoteMutations, useQuickNotesQuery } from "../hooks/useQuickNotes";
import { QuickNoteItem } from "./QuickNoteItem";
import type { DetectedDate } from "../utils/detectDate";

export function QuickNoteManager({ onClose, view = "archived", onConvertToTask }: { onClose: () => void; view?: "inbox" | "archived"; onConvertToTask?: (note: QuickNote, detected: DetectedDate | null) => void }) {
  const query = useQuickNotesQuery(view === "inbox" ? "INBOX" : "ARCHIVED", 50);
  const mutations = useQuickNoteMutations();
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const restore = async (note: QuickNote) => {
    try {
      await mutations.update.mutateAsync({ id: note.id, payload: { status: "INBOX" } });
      toast.success("¡Captura restaurada!");
    } catch {
      toast.error("Ups, no pudimos restaurar la captura. Inténtalo de nuevo.");
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
      toast.success("¡Captura eliminada!");
    } catch {
      toast.error("Ups, no pudimos eliminar la captura. Inténtalo de nuevo.");
    }
  };

  const notes = query.data ?? [];
  const inbox = view === "inbox";

  return (
    <Dialog open onOpenChange={(nextOpen) => { if (!nextOpen) onClose(); }}>
      <DialogContent className="flex max-h-[90dvh] max-w-lg flex-col gap-0 overflow-hidden rounded-lg border-outline-variant bg-surface p-0" showCloseButton={false}>
        <DialogHeader className="flex shrink-0 flex-row items-center justify-between border-b border-outline-variant bg-surface-bright px-5 py-4 text-left">
          <div>
            <p className="font-label-caps text-label-caps uppercase text-on-surface-variant">CAPTURAS RÁPIDAS</p>
            <DialogTitle className="mt-1 font-headline-xs text-headline-xs font-bold normal-case tracking-normal text-primary">{inbox ? "Capturas pendientes" : "Capturas archivadas"}</DialogTitle>
            <DialogDescription className="sr-only">Gestiona tus capturas rápidas.</DialogDescription>
          </div>
          <DialogClose asChild>
             <button aria-label="Cerrar" className="flex h-10 w-10 items-center justify-center rounded-md text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface" type="button"><X size={19} /></button>
          </DialogClose>
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-y-auto p-5" data-modal-scroll>
          {query.isLoading ? <p className="font-body-sm text-body-sm text-on-surface-variant">Cargando capturas...</p> : query.isError ? <p className="font-body-sm text-body-sm text-error">{inbox ? "Ups, no pudimos cargar tus capturas. Inténtalo de nuevo." : "Ups, no pudimos cargar las capturas archivadas. Inténtalo de nuevo."}</p> : notes.length === 0 ? <p className="font-body-sm text-body-sm text-on-surface-variant">{inbox ? "Aún no tienes capturas pendientes." : "Aún no hay capturas archivadas."}</p> : inbox && onConvertToTask ? (
            notes.map((note) => <QuickNoteItem key={note.id} note={note} onConvertToTask={onConvertToTask} />)
          ) : (
            <div className="divide-y divide-outline-variant border-y border-outline-variant">
              {notes.map((note) => (
                <div className="py-3" key={note.id}>
                  <p className="font-body-sm text-body-sm text-on-surface">{note.content}</p>
                  <p className="mt-1 font-data-mono text-data-mono text-xs text-on-surface-variant">Capturada {formatCreatedAt(note.createdAt)}</p>
                  <div className="mt-2 flex items-center gap-3">
                    <button className="flex items-center gap-1 rounded-md px-2 py-1 font-body-sm text-body-sm text-primary hover:bg-surface-container-low hover:underline" onClick={() => void restore(note)} type="button"><ArchiveRestore size={14} /> Restaurar</button>
                    <button aria-label={`Eliminar ${note.content}`} className={`flex items-center gap-1 rounded-md px-2 py-1 font-body-sm text-body-sm ${deleteId === note.id ? "bg-error text-error-foreground" : "text-on-surface-variant hover:bg-error-container hover:text-error"}`} onClick={() => void remove(note)} type="button"><Trash2 className={deleteId === note.id ? "text-on-primary" : undefined} size={14} />{deleteId === note.id ? "Confirmar" : "Eliminar"}</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="flex shrink-0 justify-end border-t border-outline-variant bg-surface-container-low px-5 py-4">
          <DialogClose asChild>
            <button className="min-h-11 rounded-md border border-outline-variant px-4 py-2 font-body-sm text-body-sm hover:bg-surface-container-high" type="button">Cerrar</button>
          </DialogClose>
        </div>
      </DialogContent>
    </Dialog>
  );
}
