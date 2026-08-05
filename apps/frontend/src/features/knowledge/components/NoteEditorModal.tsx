"use client";

import { useState } from "react";
import { Pin, X } from "lucide-react";
import { MarkdownEditor } from "@/components/ui/MarkdownEditor";
import type { Note } from "@/types/entities";
import { noteFormSchema, type NoteForm } from "../schemas/knowledge.schema";

function parseTags(value: string) {
  return value
    .split(",")
    .map((tag) => tag.trim().toLowerCase())
    .filter(Boolean)
    .slice(0, 20);
}

export function NoteEditorModal({
  note,
  onClose,
  onSave,
  onDelete,
}: {
  note: Note | null;
  onClose: () => void;
  onSave: (form: NoteForm) => Promise<void>;
  onDelete?: () => Promise<void>;
}) {
  const [form, setForm] = useState<NoteForm>({
    title: note?.title ?? "",
    content: note?.content ?? "",
    category: note?.category ?? undefined,
    tags: note?.tags ?? [],
    pinned: note?.pinned ?? false,
  });
  const [tagsText, setTagsText] = useState((note?.tags ?? []).join(", "));
  const [error, setError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  const set = <K extends keyof NoteForm>(key: K, value: NoteForm[K]) => setForm((current) => ({ ...current, [key]: value }));

  const submit = async () => {
    const result = noteFormSchema.safeParse({ ...form, tags: parseTags(tagsText) });
    if (!result.success) {
      setError(result.error.issues[0]?.message ?? "Revisa los datos e inténtalo de nuevo");
      return;
    }
    setError("");
    try {
      await onSave(result.data);
    } catch {
      setError("Ups, no pudimos guardar tu nota. Inténtalo de nuevo.");
    }
  };

  const remove = async () => {
    if (!onDelete) return;
    try {
      await onDelete();
    } catch {
      setError("Ups, no pudimos borrar tu nota. Inténtalo de nuevo.");
    }
  };

  return (
    <div aria-modal="true" className="fixed inset-0 z-[60] flex items-center justify-center bg-on-surface/20 p-4 backdrop-blur-[1px]" role="dialog">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col border border-outline-variant bg-surface shadow-none">
        <div className="flex items-center justify-between border-b border-outline-variant bg-surface-bright px-5 py-4">
          <h2 className="font-headline-xs text-headline-xs font-bold text-primary">{note ? "Editar nota" : "Nueva nota"}</h2>
          <button aria-label="Cerrar" className="text-on-surface-variant hover:text-on-surface" onClick={onClose} type="button"><X size={19} /></button>
        </div>
        <div className="space-y-4 overflow-y-auto p-5">
          <label className="block">
            <span className="font-label-caps text-label-caps text-on-surface-variant">TÍTULO</span>
            <input autoFocus className="field mt-1" maxLength={200} onChange={(event) => set("title", event.target.value)} value={form.title} />
          </label>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="font-label-caps text-label-caps text-on-surface-variant">CATEGORÍA (OPCIONAL)</span>
              <input className="field mt-1" maxLength={60} onChange={(event) => set("category", event.target.value || undefined)} placeholder="Ej: investigación" value={form.category ?? ""} />
            </label>
            <label className="block">
              <span className="font-label-caps text-label-caps text-on-surface-variant">ETIQUETAS (OPCIONAL)</span>
              <input className="field mt-1" onChange={(event) => setTagsText(event.target.value)} placeholder="ideas, recursos" value={tagsText} />
            </label>
          </div>
          <div className="block">
            <span className="font-label-caps text-label-caps text-on-surface-variant">CONTENIDO</span>
            <div className="mt-1">
              <MarkdownEditor minHeight="16rem" onChange={(content) => set("content", content)} placeholder="Escribe tu nota..." value={form.content} />
            </div>
          </div>
          <label className="flex cursor-pointer items-center gap-2">
            <input checked={form.pinned} className="h-4 w-4 accent-primary" onChange={(event) => set("pinned", event.target.checked)} type="checkbox" />
            <span className="flex items-center gap-1 font-body-sm text-body-sm text-on-surface-variant"><Pin size={13} /> Nota fijada</span>
          </label>
          {error && <p className="border border-error bg-error-container p-2 font-body-sm text-body-sm text-on-error-container">{error}</p>}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-outline-variant bg-surface-container-low px-5 py-4 sm:gap-3">
          {note && onDelete ? (
            <button
              className={`${confirmDelete ? "bg-error px-3 py-2 font-body-sm text-body-sm text-error-foreground" : "px-2 py-2 font-body-sm text-body-sm text-error hover:bg-error-container/30"} whitespace-nowrap`}
              onClick={() => {
                if (!confirmDelete) {
                  setConfirmDelete(true);
                  return;
                }
                void remove();
              }}
              type="button"
            >
              {confirmDelete ? "¿Eliminar nota?" : "Eliminar"}
            </button>
          ) : <span />}
          <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-3">
            <button className="whitespace-nowrap border border-outline-variant bg-surface-container-lowest px-4 py-2 font-body-sm text-body-sm hover:bg-surface-container-high" onClick={onClose} type="button">Cancelar</button>
            <button className="whitespace-nowrap bg-primary-container px-4 py-2 font-body-sm text-body-sm text-on-primary hover:bg-primary" onClick={() => void submit()} type="button">
              {note ? "Guardar cambios" : "Crear nota"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
