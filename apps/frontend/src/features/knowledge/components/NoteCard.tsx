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
    <article className="group flex min-w-0 flex-col rounded-xl border border-outline-variant/70 bg-surface-container-lowest shadow-sm transition-shadow hover:shadow-md">
      <div className="flex min-w-0 items-start justify-between gap-2 p-5 pb-0">
        <h2 className="line-clamp-2 min-w-0 break-words font-headline-xs text-headline-xs font-semibold text-on-surface">{note.title}</h2>
        <button
          aria-label={note.pinned ? "Desfijar" : "Fijar"}
          className={`shrink-0 rounded-lg p-2 ${note.pinned ? "bg-secondary-fixed text-secondary" : "text-on-surface-variant hover:bg-surface-container-low hover:text-primary"}`}
          onClick={() => void onTogglePin(note)}
          type="button"
        >
          <Pin size={16} fill={note.pinned ? "currentColor" : "none"} />
        </button>
      </div>
      <button className="min-w-0 flex-1 p-5 text-left" onClick={() => onEdit(note)} type="button">
        <p className="line-clamp-5 break-words whitespace-pre-line font-body-md text-body-md leading-relaxed text-on-surface">{note.content}</p>
      </button>
      <div className="flex items-end justify-between gap-2 px-5 pb-5 pt-0">
        <div className="min-w-0 flex-1">
          {note.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {note.tags.map((tag, index) => (
                <span className="rounded-full bg-surface-container-low px-2 py-0.5 font-label-md text-label-md text-on-surface-variant" key={`${tag}-${index}`}>
                  #{tag}
                </span>
              ))}
            </div>
          )}
          <p className="mt-1 break-words font-data-mono text-data-mono text-[11px] text-on-surface-variant">
            {note.category ? `${note.category} · ` : ""}{noteDate(note.updatedAt)}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button aria-label="Convertir en tarea" className="flex items-center gap-1.5 rounded-lg bg-surface-container px-2.5 py-1.5 font-label-md text-label-md font-semibold text-on-surface hover:bg-surface-container-high" onClick={convertToTask} title="Convertir en tarea" type="button">
            <ArrowRightLeft className="text-secondary" size={14} />
            <span className="hidden sm:inline">Convertir</span>
          </button>
          <button aria-label="Editar" className="rounded-lg p-2 text-on-surface-variant hover:bg-surface-container-low hover:text-primary" onClick={() => onEdit(note)} title="Editar" type="button">
            <Pencil size={14} />
          </button>
        </div>
      </div>
    </article>
  );
}
