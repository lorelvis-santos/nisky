"use client";

import { Archive, ArrowRight, CalendarClock, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import type { QuickNote } from "@/types/entities";
import { formatCreatedAt } from "@/lib/utils";
import { useQuickNoteMutations } from "../hooks/useQuickNotes";
import { detectDate, type DetectedDate } from "../utils/detectDate";

export function QuickNoteItem({ note, onConvertToTask }: { note: QuickNote; onConvertToTask: (note: QuickNote, detected: DetectedDate | null) => void }) {
  const mutations = useQuickNoteMutations();
  const detected = detectDate(note.content);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const archive = async () => {
    try { await mutations.archive.mutateAsync(note.id); toast.success("¡Nota archivada!"); } catch { toast.error("Ups, no pudimos archivar la nota. Inténtalo de nuevo."); }
  };

  const remove = async () => {
    if (!confirmDelete) { setConfirmDelete(true); return; }
    try { await mutations.remove.mutateAsync(note.id); toast.success("¡Nota eliminada!"); } catch { toast.error("Ups, no pudimos eliminar la nota. Inténtalo de nuevo."); }
  };

  return (
    <div className="border-b border-outline-variant py-2 last:border-b-0">
      <p className="font-body-sm text-body-sm text-on-surface">{note.content}</p>
      <p className="mt-1 font-data-mono text-data-mono text-xs text-on-surface-variant">Creada {formatCreatedAt(note.createdAt)}</p>
      {detected && <span className="mt-1 inline-flex items-center gap-1 font-data-mono text-data-mono text-xs text-tertiary"><CalendarClock size={12} /> Fecha: {detected.label}</span>}
      <div className="mt-2 flex items-center justify-between gap-3 pt-2">
        <button className="flex items-center gap-1 font-body-sm text-body-sm text-primary hover:underline" onClick={() => onConvertToTask(note, detected)} type="button"><ArrowRight size={13} /> Convertir en tarea</button>
        <div className="flex items-center gap-3">
          <button aria-label="Archivar nota" className="text-on-surface-variant hover:text-primary" onClick={() => void archive()} type="button"><Archive size={14} /></button>
          <button aria-label="Eliminar nota" className={confirmDelete ? "bg-error px-2 py-1 text-error-foreground" : "text-on-surface-variant hover:text-error"} onClick={() => void remove()} type="button"><Trash2 className={confirmDelete ? "text-on-primary" : undefined} size={14} /></button>
        </div>
      </div>
    </div>
  );
}
