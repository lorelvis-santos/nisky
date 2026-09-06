"use client";

import { Pencil, Pin } from "lucide-react";
import type { Note } from "@/types/entities";
import { PreviewSheet } from "@/components/ui/PreviewSheet";
import { MarkdownPreview } from "@/components/ui/MarkdownPreview";

function noteDate(value: string) {
  return new Date(value).toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" });
}

export function NotePreviewModal({
  note,
  onClose,
  onEdit,
  onTogglePin,
}: {
  note: Note;
  onClose: () => void;
  onEdit?: () => void;
  onTogglePin?: () => void;
}) {
  return (
    <PreviewSheet
      eyebrow="Nota"
      footer={
        <>
          {onTogglePin && (
            <button className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-outline-variant px-3 font-label-md text-label-md text-on-surface-variant hover:bg-surface-container-low hover:text-primary" onClick={onTogglePin} type="button">
              <Pin size={15} /> {note.pinned ? "Desfijar" : "Fijar"}
            </button>
          )}
          {onEdit && (
            <button className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-primary px-3.5 font-label-md text-label-md font-semibold text-on-primary hover:bg-primary-container hover:text-on-primary-container" onClick={onEdit} type="button">
              <Pencil size={15} /> Editar nota
            </button>
          )}
        </>
      }
      onClose={onClose}
      title={note.title}
      wide
    >
      <div className="space-y-5">
        <div className="flex flex-wrap items-center gap-2">
          {note.category && <span className="rounded-full bg-secondary-container px-2.5 py-1 font-label-md text-label-md text-on-secondary-container">{note.category}</span>}
          {note.pinned && <span className="inline-flex items-center gap-1.5 rounded-full bg-tertiary-container px-2.5 py-1 font-label-md text-label-md text-on-tertiary-container"><Pin size={13} /> Fijada</span>}
          <span className="font-data-mono text-data-mono text-[11px] text-on-surface-variant">Actualizada {noteDate(note.updatedAt)}</span>
        </div>

        {note.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {note.tags.map((tag, index) => <span className="rounded-full bg-surface-container-low px-2 py-0.5 font-label-md text-label-md text-on-surface-variant" key={`${tag}-${index}`}>#{tag}</span>)}
          </div>
        )}

        <div className="rounded-xl border border-outline-variant bg-surface-container-lowest">
          {note.content.trim() ? <MarkdownPreview className="px-4 py-4" content={note.content} /> : <p className="px-4 py-8 text-center font-body-sm text-body-sm text-on-surface-variant">Sin contenido.</p>}
        </div>
      </div>
    </PreviewSheet>
  );
}
