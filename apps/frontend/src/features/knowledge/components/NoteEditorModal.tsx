"use client";

import { useEffect, useRef, useState } from "react";
import { Pin, X } from "lucide-react";
import { MarkdownEditor } from "@/components/ui/MarkdownEditor";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useDraftAutosave } from "@/hooks/useDraftAutosave";
import { useAccessibleProjects } from "@/features/projects/hooks/useProjects";
import type { Note, NoteDraft } from "@/types/entities";
import { deleteNoteDraft, fetchNoteDraft, saveNoteDraft, type NoteDraftPayload } from "../api/knowledge";
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
  defaultProjectId,
  onClose,
  onSave,
  onDelete,
}: {
  note: Note | null;
  defaultProjectId?: string | null;
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
    projectId: note?.projectId ?? defaultProjectId ?? undefined,
  });
  const [tagsText, setTagsText] = useState((note?.tags ?? []).join(", "));
  const [error, setError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [restoredAt, setRestoredAt] = useState<Date | null>(null);
  const appliedRestoreRef = useRef(false);
  const isNew = note === null;
  const projectsQuery = useAccessibleProjects();
  const projects = projectsQuery.data ?? [];

  const draft = useDraftAutosave<NoteDraft, NoteDraftPayload>({
    load: fetchNoteDraft,
    save: saveNoteDraft,
    clear: deleteNoteDraft,
    isDirty: (payload) => Boolean(payload.title.trim() || payload.content.trim() || payload.category?.trim() || payload.tags.length || payload.pinned || payload.projectId),
  });

  useEffect(() => {
    if (!draft.restored) return;
    appliedRestoreRef.current = true;
    // Apply an asynchronously restored draft to the controlled editor state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setForm({
      title: draft.restored.title ?? "",
      content: draft.restored.content ?? "",
      category: draft.restored.category ?? undefined,
      tags: draft.restored.tags ?? [],
      pinned: draft.restored.pinned ?? false,
      projectId: draft.restored.projectId ?? (defaultProjectId ?? undefined),
    });
    setTagsText((draft.restored.tags ?? []).join(", "));
    setRestoredAt(new Date(draft.restored.updatedAt));
  }, [defaultProjectId, draft.restored]);

  useEffect(() => {
    if (!isNew) return;
    if (appliedRestoreRef.current) {
      appliedRestoreRef.current = false;
      return;
    }
    draft.update({ title: form.title, content: form.content, category: form.category ?? null, tags: form.tags ?? [], pinned: form.pinned, projectId: form.projectId ?? null });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form, tagsText, isNew]);

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
      if (isNew) {
        await draft.discard();
        setRestoredAt(null);
      }
    } catch {
      setError("Ups, no pudimos guardar tu nota. Inténtalo de nuevo.");
    }
  };

  const remove = async () => {
    if (!onDelete) return;
    try {
      await onDelete();
      await draft.discard();
      setRestoredAt(null);
    } catch {
      setError("Ups, no pudimos borrar tu nota. Inténtalo de nuevo.");
    }
  };

  return (
    <Dialog open onOpenChange={(nextOpen) => { if (!nextOpen) onClose(); }}>
      <DialogContent className="flex max-h-[90dvh] max-w-2xl flex-col gap-0 overflow-hidden rounded-lg border-outline-variant bg-surface p-0" showCloseButton={false}>
        <DialogHeader className="flex shrink-0 flex-row items-center justify-between border-b border-outline-variant bg-surface-bright px-5 py-4 text-left">
          <div>
            <DialogTitle className="font-headline-xs text-headline-xs font-bold normal-case tracking-normal text-primary">{note ? "Editar nota" : "Nueva nota"}</DialogTitle>
            <DialogDescription className="sr-only">Edita el título, contenido y organización de tu nota.</DialogDescription>
          </div>
          <DialogClose asChild>
             <button aria-label="Cerrar" className="flex h-10 w-10 items-center justify-center rounded-md text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface" type="button"><X size={19} /></button>
          </DialogClose>
        </DialogHeader>
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5" data-modal-scroll>
          {restoredAt && (
             <p className="flex items-center justify-between gap-2 rounded-md border border-outline-variant bg-surface-container-low px-3 py-2 font-body-sm text-body-sm text-on-surface-variant">
              <span>Se restauró tu borrador de {restoredAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}.</span>
              <button
                 className="rounded-md px-2 py-1 font-body-sm text-body-sm text-error hover:bg-error-container/30 hover:underline"
                onClick={() => {
                  setForm({ title: "", content: "", category: undefined, tags: [], pinned: false, projectId: undefined });
                  setTagsText("");
                  setRestoredAt(null);
                  void draft.discard();
                }}
                type="button"
              >
                Descartar
              </button>
            </p>
          )}
          <label className="block">
            <span className="font-label-caps text-label-caps text-on-surface-variant">TÍTULO</span>
            <input autoFocus className="field mt-1" maxLength={200} onChange={(event) => set("title", event.target.value)} value={form.title} />
          </label>
          <div className="grid grid-cols-1 gap-3 border-y border-outline-variant py-4 sm:grid-cols-2">
            <label className="block">
              <span className="font-label-caps text-label-caps text-on-surface-variant">PROYECTO (OPCIONAL)</span>
              <select
                className="field mt-1"
                onChange={(event) => {
                  set("projectId", event.target.value || null);
                }}
                value={form.projectId ?? ""}
              >
                <option value="">Sin proyecto</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>{project.name}</option>
                ))}
              </select>
              {form.projectId && (
                <p className="mt-1 font-data-mono text-data-mono text-xs text-on-surface-variant">
                   Nota compartida en {projects.find((project) => project.id === form.projectId)?.name ?? "un proyecto"}
                </p>
              )}
            </label>
          </div>
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
           {error && <p className="rounded-md border border-error bg-error-container p-2 font-body-sm text-body-sm text-on-error-container">{error}</p>}
        </div>
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-outline-variant bg-surface-container-low px-5 py-4 sm:gap-3">
          {note && onDelete ? (
            <button
               className={`${confirmDelete ? "rounded-md bg-error px-3 py-2 font-body-sm text-body-sm text-error-foreground" : "rounded-md px-2 py-2 font-body-sm text-body-sm text-error hover:bg-error-container/30"} whitespace-nowrap`}
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
            <span className="mr-auto self-center whitespace-nowrap font-body-sm text-body-sm text-on-surface-variant">
              {isNew && (draft.state === "saving" ? "Guardando borrador..." : draft.state === "error" ? "Error al guardar el borrador" : draft.state === "saved" ? "Borrador guardado" : "")}
            </span>
            <DialogClose asChild>
              <button className="min-h-11 whitespace-nowrap rounded-md border border-outline-variant bg-surface-container-lowest px-4 py-2 font-body-sm text-body-sm hover:bg-surface-container-high" type="button">Cancelar</button>
            </DialogClose>
             <button className="min-h-11 whitespace-nowrap rounded-md bg-primary-container px-4 py-2 font-body-sm text-body-sm text-on-primary hover:bg-primary" onClick={() => void submit()} type="button">
              {note ? "Guardar cambios" : "Crear nota"}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
