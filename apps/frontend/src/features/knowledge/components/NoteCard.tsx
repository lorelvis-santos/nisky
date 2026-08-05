"use client";

import { useRouter } from "next/navigation";
import { ArrowRightLeft, Pin, Pencil } from "lucide-react";
import type { Note } from "@/types/entities";

function noteDate(value: string) {
  return new Date(value).toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" });
}

export function NoteCard({
  note,
  onEdit,
  onTogglePin,
}: {
  note: Note;
  onEdit: (note: Note) => void;
  onTogglePin: (note: Note) => Promise<void>;
}) {
  const router = useRouter();

  const convertToTask = () => {
    const prefill = encodeURIComponent(JSON.stringify({ title: note.title }));
    router.push(`/tasks?modal=create&prefill=${prefill}`);
  };

  return (
    <article className="flex flex-col border border-outline-variant bg-surface-container-lowest">
      <div className="flex items-start justify-between gap-2 border-b border-outline-variant p-container-padding">
        <h2 className="line-clamp-2 font-body-md font-medium text-body-md text-primary">{note.title}</h2>
        <button
          aria-label={note.pinned ? "Desfijar" : "Fijar"}
          className={`shrink-0 ${note.pinned ? "text-primary" : "text-on-surface-variant hover:text-primary"}`}
          onClick={() => void onTogglePin(note)}
          type="button"
        >
          <Pin size={16} fill={note.pinned ? "currentColor" : "none"} />
        </button>
      </div>
      <button className="flex-1 p-container-padding text-left" onClick={() => onEdit(note)} type="button">
        <p className="line-clamp-5 whitespace-pre-line font-body-sm text-body-sm text-on-surface-variant">{note.content}</p>
      </button>
      <div className="flex items-center justify-between gap-2 border-t border-outline-variant px-container-padding py-2">
        <div className="min-w-0 flex-1">
          {note.tags.length > 0 && (
            <p className="truncate font-data-mono text-data-mono text-xs text-on-surface-variant">
              {note.tags.map((tag) => `#${tag}`).join(" ")}
            </p>
          )}
          <p className="font-data-mono text-data-mono text-[11px] text-on-surface-variant">
            {note.category ? `${note.category} · ` : ""}{noteDate(note.updatedAt)}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button aria-label="Convertir en tarea" className="p-1 text-on-surface-variant hover:text-primary" onClick={convertToTask} title="Convertir en tarea" type="button">
            <ArrowRightLeft size={14} />
          </button>
          <button aria-label="Editar" className="p-1 text-on-surface-variant hover:text-primary" onClick={() => onEdit(note)} title="Editar" type="button">
            <Pencil size={14} />
          </button>
        </div>
      </div>
    </article>
  );
}
