"use client";

import { Archive, ArchiveRestore, ArrowRight, CalendarClock, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import type { QuickNote } from "@/types/entities";
import { formatCreatedAt } from "@/lib/utils";
import { useQuickNoteMutations } from "../hooks/useQuickNotes";
import { detectDate, type DetectedDate } from "../utils/detectDate";

export function QuickNoteItem({ note, onOpen, onConvertToTask, archived = false }: { note: QuickNote; onOpen?: (note: QuickNote) => void; onConvertToTask?: (note: QuickNote, detected: DetectedDate | null) => void; archived?: boolean }) {
  const mutations = useQuickNoteMutations();
  const detected = detectDate(note.content);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const archive = async () => {
    try { await mutations.archive.mutateAsync(note.id); toast.success("¡Captura archivada!"); } catch { toast.error("Ups, no pudimos archivar la captura. Inténtalo de nuevo."); }
  };

  const restore = async () => {
    try { await mutations.update.mutateAsync({ id: note.id, payload: { status: "INBOX" } }); toast.success("¡Captura restaurada!"); } catch { toast.error("Ups, no pudimos restaurar la captura. Inténtalo de nuevo."); }
  };

  const remove = async () => {
    if (!confirmDelete) { setConfirmDelete(true); return; }
    try { await mutations.remove.mutateAsync(note.id); toast.success("¡Captura eliminada!"); } catch { toast.error("Ups, no pudimos eliminar la captura. Inténtalo de nuevo."); }
  };

  return (
    <div className="border-b border-outline-variant py-3 last:border-b-0 lg:flex lg:h-full lg:min-h-40 lg:flex-col lg:rounded-lg lg:border lg:bg-surface-container-lowest lg:p-4 lg:shadow-sm lg:last:border-b">
      {onOpen ? (
        <button aria-label="Vista previa de la captura" className="block w-full rounded-md text-left" onClick={() => onOpen(note)} type="button">
          <p className="line-clamp-3 break-words font-body-sm text-body-sm leading-relaxed text-on-surface">{note.content}</p>
        </button>
      ) : (
        <p className="line-clamp-3 break-words font-body-sm text-body-sm leading-relaxed text-on-surface">{note.content}</p>
      )}
      <p className="mt-1 font-data-mono text-data-mono text-xs text-on-surface-variant">Capturada {formatCreatedAt(note.createdAt)}</p>
      {detected && <span className="mt-1 inline-flex items-center gap-1 font-data-mono text-data-mono text-xs text-tertiary"><CalendarClock size={12} /> Fecha: {detected.label}</span>}
      <div className="mt-2 flex flex-wrap items-center justify-between gap-3 pt-2 lg:mt-auto">
        {onConvertToTask && <button className="flex items-center gap-1 rounded-lg bg-surface-container-low px-2.5 py-1.5 font-label-md text-label-md font-semibold text-on-surface hover:bg-surface-container-high" onClick={() => onConvertToTask(note, detected)} type="button"><ArrowRight size={13} className="text-secondary" /> Crear tarea</button>}
        <div className="flex items-center gap-3">
          {archived ? (
            <button aria-label="Restaurar captura" className="rounded-lg p-2 text-on-surface-variant hover:bg-surface-container-low hover:text-primary" onClick={() => void restore()} title="Restaurar captura" type="button"><ArchiveRestore size={14} /></button>
          ) : (
            <button aria-label="Archivar captura" className="rounded-lg p-2 text-on-surface-variant hover:bg-surface-container-low hover:text-primary" onClick={() => void archive()} title="Archivar captura" type="button"><Archive size={14} /></button>
          )}
          <button aria-label="Eliminar captura" className={confirmDelete ? "rounded-lg bg-error px-2 py-1 text-error-foreground" : "rounded-lg p-2 text-on-surface-variant hover:bg-error-container hover:text-error"} onClick={() => void remove()} type="button"><Trash2 className={confirmDelete ? "text-on-primary" : undefined} size={14} /></button>
        </div>
      </div>
    </div>
  );
}
