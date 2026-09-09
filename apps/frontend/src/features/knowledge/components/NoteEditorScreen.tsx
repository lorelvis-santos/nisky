"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Check, FileText, FolderOpen, Pin, Save, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthProvider";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { MarkdownEditor } from "@/components/ui/MarkdownEditor";
import { useDraftAutosave } from "@/hooks/useDraftAutosave";
import { useAccessibleProjects } from "@/features/projects/hooks/useProjects";
import { useNoteMutations } from "../hooks/useKnowledge";
import { deleteNoteDraft, fetchNoteDraft, saveNoteDraft, type NoteDraftPayload } from "../api/knowledge";
import { noteFormSchema, type NoteForm } from "../schemas/knowledge.schema";
import type { Note, NoteDraft } from "@/types/entities";

function parseTags(value: string) {
  return value
    .split(",")
    .map((tag) => tag.trim().toLowerCase())
    .filter(Boolean)
    .slice(0, 20);
}

function emptyForm(defaultProjectId?: string | null): NoteForm {
  return {
    title: "",
    content: "",
    category: undefined,
    tags: [],
    pinned: false,
    projectId: defaultProjectId ?? undefined,
  };
}

function formatDraftTime(value: string) {
  return new Date(value).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function resizeTitleInput(input: HTMLTextAreaElement) {
  input.style.height = "auto";
  input.style.height = `${Math.min(input.scrollHeight, 112)}px`;
}

export function safeNoteReturnTo(value: string | null, fallback: string) {
  return value?.startsWith("/") && !value.startsWith("//") ? value : fallback;
}

export function EditorLoading() {
  return <section className="flex h-full min-h-0 items-center justify-center bg-background font-body-sm text-body-sm text-on-surface-variant">Cargando editor...</section>;
}

export function EditorMessage({ message, onBack }: { message: string; onBack: () => void }) {
  return (
    <section className="flex h-full min-h-0 items-center justify-center overflow-y-auto bg-background p-6">
      <div className="w-full max-w-md rounded-2xl border border-outline-variant bg-surface-container-lowest p-8 text-center shadow-sm">
        <FileText className="mx-auto text-primary" size={28} />
        <p className="mt-4 font-body-md text-body-md text-on-surface-variant">{message}</p>
        <button
          className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-4 py-2.5 font-label-md text-label-md font-semibold text-on-primary hover:bg-primary-container hover:text-on-primary-container"
          onClick={onBack}
          type="button"
        >
          <ArrowLeft size={16} /> Volver
        </button>
      </div>
    </section>
  );
}

export function NoteEditorScreen({
  defaultProjectId,
  note = null,
  returnTo,
}: {
  defaultProjectId?: string | null;
  note?: Note | null;
  returnTo: string;
}) {
  const router = useRouter();
  const { user } = useAuth();
  const projectsQuery = useAccessibleProjects();
  const mutations = useNoteMutations();
  const isNew = note === null;
  const [form, setForm] = useState<NoteForm>(() => note ? {
    title: note.title,
    content: note.content,
    category: note.category ?? undefined,
    tags: note.tags,
    pinned: note.pinned,
    projectId: note.projectId,
  } : emptyForm(defaultProjectId));
  const [tagsText, setTagsText] = useState(() => (note?.tags ?? []).join(", "));
  const [error, setError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [restoredAt, setRestoredAt] = useState<Date | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [draftRestored, setDraftRestored] = useState(false);
  const titleInputRef = useRef<HTMLTextAreaElement>(null);
  const restoredDraftRef = useRef(false);
  const skipDraftSyncRef = useRef(false);

  const draft = useDraftAutosave<NoteDraft, NoteDraftPayload>({
    load: isNew ? fetchNoteDraft : async () => null,
    save: isNew ? saveNoteDraft : async () => {},
    clear: isNew ? deleteNoteDraft : async () => {},
    isDirty: (payload) => Boolean(
      payload.title.trim() ||
      payload.content.trim() ||
      payload.category?.trim() ||
      payload.tags.length ||
      payload.pinned ||
      payload.projectId,
    ),
  });

  useEffect(() => {
    if (!draft.restored || restoredDraftRef.current) return;
    restoredDraftRef.current = true;
    skipDraftSyncRef.current = true;
    setDraftRestored(true);
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
    if (skipDraftSyncRef.current) {
      skipDraftSyncRef.current = false;
      return;
    }
    draft.update({
      title: form.title,
      content: form.content,
      category: form.category ?? null,
      tags: parseTags(tagsText),
      pinned: form.pinned,
      projectId: form.projectId ?? null,
    });
    // The draft hook intentionally tracks the complete controlled form.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form, isNew, tagsText]);

  useEffect(() => {
    if (!titleInputRef.current) return;
    resizeTitleInput(titleInputRef.current);
  }, [form.title]);

  const set = <K extends keyof NoteForm>(key: K, value: NoteForm[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
    setError("");
  };

  const submit = async () => {
    const result = noteFormSchema.safeParse({ ...form, tags: parseTags(tagsText) });
    if (!result.success) {
      setError(result.error.issues[0]?.message ?? "Revisa los datos e inténtalo de nuevo.");
      return;
    }

    setError("");
    setSaving(true);
    try {
      if (note) {
        await mutations.update.mutateAsync({ id: note.id, payload: result.data });
        toast.success("Nota actualizada");
      } else {
        await mutations.create.mutateAsync(result.data);
        await draft.discard();
        toast.success("Nota creada");
      }
      router.replace(returnTo);
    } catch {
      setError("No pudimos guardar la nota. Inténtalo de nuevo.");
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!note || saving) return;
    setSaving(true);
    try {
      await mutations.remove.mutateAsync(note.id);
      toast.success("Nota eliminada");
      router.replace(returnTo);
    } catch {
      setError("No pudimos borrar la nota. Inténtalo de nuevo.");
      setSaving(false);
    }
  };

  const projects = projectsQuery.data ?? [];
  const selectedProject = projects.find((project) => project.id === form.projectId);
  const contentLength = form.content.length;
  const hasChanges = isNew
    ? Boolean(form.title || form.content || form.category || tagsText || form.pinned || form.projectId)
    : form.title !== note.title ||
      form.content !== note.content ||
      (form.category ?? "") !== (note.category ?? "") ||
      tagsText !== note.tags.join(", ") ||
      form.pinned !== note.pinned ||
      form.projectId !== note.projectId;
  const goBack = () => {
    if (!isNew && hasChanges) {
      setConfirmLeave(true);
      return;
    }
    router.push(returnTo);
  };

  if (note && user && note.userId !== user.id) {
    return <EditorMessage message="Solo la persona propietaria puede editar esta nota." onBack={goBack} />;
  }

  return (
    <section className="flex h-full min-h-0 flex-col overflow-y-auto bg-background">
      <header className="sticky top-0 z-20 shrink-0 border-b border-outline-variant bg-surface-bright/95 px-4 py-3 shadow-sm backdrop-blur sm:px-6 lg:px-10">
        <div className="mx-auto flex max-w-[1440px] items-center gap-3">
          <button
            aria-label="Volver"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface"
            onClick={goBack}
            type="button"
          >
            <ArrowLeft size={19} />
          </button>
          <div className="min-w-0 flex-1">
            <p className="font-label-caps text-label-caps uppercase text-on-surface-variant">EDITOR DE NOTAS</p>
            <p className="truncate font-body-sm text-body-sm font-semibold text-on-surface">{note ? "Editar nota" : "Nueva nota"}</p>
          </div>
          <div className="hidden items-center gap-1.5 font-body-sm text-body-sm text-on-surface-variant sm:flex">
            {isNew && draft.state === "saving" && <span>Guardando borrador...</span>}
            {isNew && draft.state === "saved" && <><Check size={15} className="text-primary" /> Borrador guardado</>}
            {!isNew && hasChanges && <span>Cambios sin guardar</span>}
            {!hasChanges && !isNew && <><Check size={15} className="text-primary" /> No hay cambios pendientes</>}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              className="min-h-11 rounded-xl border border-outline-variant px-3 font-label-md text-label-md font-semibold text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface"
              onClick={goBack}
              type="button"
            >
              Cancelar
            </button>
            <button
              className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-3.5 py-2.5 font-label-md text-label-md font-semibold text-on-primary hover:bg-primary-container hover:text-on-primary-container disabled:cursor-wait disabled:opacity-60"
              disabled={saving}
              onClick={() => void submit()}
              type="button"
            >
              <Save size={16} /> <span className="hidden sm:inline">{note ? "Guardar cambios" : "Crear nota"}</span><span className="sm:hidden">Guardar</span>
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto grid w-full max-w-[1440px] flex-1 gap-6 p-4 sm:p-6 lg:grid-cols-[minmax(0,1fr)_19rem] lg:p-10">
        <main className="min-w-0">
          {draftRestored && restoredAt && (
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/20 bg-primary-fixed px-4 py-3 font-body-sm text-body-sm text-on-primary-fixed">
              <span>Se restauró tu borrador de {formatDraftTime(restoredAt.toISOString())}.</span>
              <button
                className="rounded-lg px-2 py-1 font-label-md text-label-md font-semibold text-primary hover:bg-primary-fixed-dim"
                onClick={() => {
                  setForm(emptyForm(defaultProjectId));
                  setTagsText("");
                  setRestoredAt(null);
                  setDraftRestored(false);
                  void draft.discard();
                }}
                type="button"
              >
                Descartar
              </button>
            </div>
          )}

          <div className="mb-6 flex items-start gap-3">
            <FileText className="mt-2 shrink-0 text-primary" size={22} />
            <textarea
              aria-label="Título de la nota"
              autoFocus
              className="block max-h-28 min-h-0 w-full min-w-0 resize-none overflow-x-hidden overflow-y-auto whitespace-pre-wrap break-words border-0 bg-transparent p-0 text-2xl font-semibold leading-8 text-on-surface outline-none placeholder:text-on-surface-variant/60 focus:ring-0 [overflow-wrap:anywhere] sm:text-3xl sm:leading-9"
              maxLength={200}
              onChange={(event) => {
                set("title", event.target.value);
                resizeTitleInput(event.currentTarget);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") event.preventDefault();
              }}
              placeholder="Título de la nota"
              ref={titleInputRef}
              rows={1}
              value={form.title}
              wrap="soft"
            />
          </div>

          <div className="overflow-hidden rounded-2xl border border-outline-variant bg-surface-container-lowest shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-outline-variant bg-surface-container-low px-4 py-3 sm:px-5">
              <div>
                <p className="font-label-caps text-label-caps text-on-surface-variant">CONTENIDO</p>
                <p className="mt-0.5 font-body-sm text-body-sm text-on-surface-variant">Escribe con Markdown y revisa la vista previa cuando quieras.</p>
              </div>
              <span className="font-data-mono text-data-mono text-[11px] text-on-surface-variant">{contentLength.toLocaleString("es-CO")} caracteres</span>
            </div>
            <div className="p-3 sm:p-5">
              <MarkdownEditor maxHeight="min(68vh, 42rem)" minHeight="clamp(22rem, 52vh, 34rem)" onChange={(content) => set("content", content)} placeholder="Empieza a escribir tu nota..." value={form.content} />
            </div>
          </div>
        </main>

        <aside className="min-w-0 space-y-4">
          <section className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-4 shadow-sm sm:p-5">
            <div className="mb-4 flex items-center gap-2">
              <FolderOpen className="text-primary" size={17} />
              <h2 className="font-headline-xs text-headline-xs font-semibold text-on-surface">Organización</h2>
            </div>
            <label className="block">
              <span className="font-label-caps text-label-caps text-on-surface-variant">PROYECTO</span>
              <select
                className="field mt-1"
                disabled={projectsQuery.isLoading}
                onChange={(event) => set("projectId", event.target.value || null)}
                value={form.projectId ?? ""}
              >
                <option value="">Sin proyecto</option>
                {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
              </select>
              {selectedProject && <span className="mt-1 block font-data-mono text-data-mono text-[11px] text-on-surface-variant">Compartida en {selectedProject.name}</span>}
            </label>
            <label className="mt-4 block">
              <span className="font-label-caps text-label-caps text-on-surface-variant">CATEGORÍA</span>
              <input className="field mt-1" maxLength={60} onChange={(event) => set("category", event.target.value || undefined)} placeholder="Ej: investigación" value={form.category ?? ""} />
            </label>
            <label className="mt-4 block">
              <span className="font-label-caps text-label-caps text-on-surface-variant">ETIQUETAS</span>
              <input className="field mt-1" onChange={(event) => { setTagsText(event.target.value); setError(""); }} placeholder="ideas, recursos" value={tagsText} />
              <span className="mt-1 block font-body-sm text-body-sm text-on-surface-variant">Sepáralas con comas.</span>
            </label>
            <button
              aria-checked={Boolean(form.pinned)}
              className="mt-5 flex w-full items-center gap-3 rounded-xl border border-outline-variant bg-surface-container-low px-3 py-3 text-left transition-colors hover:border-primary/40 hover:bg-primary-fixed/40"
              onClick={() => set("pinned", !form.pinned)}
              role="switch"
              type="button"
            >
              <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors ${form.pinned ? "bg-primary text-on-primary" : "bg-surface-container-high text-on-surface-variant"}`}>
                <Pin fill={form.pinned ? "currentColor" : "none"} size={17} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-label-md text-label-md font-semibold text-on-surface">Nota fijada</span>
                <span className="mt-0.5 block font-body-sm text-body-sm text-on-surface-variant">{form.pinned ? "Aparecerá primero en tus notas." : "Fíjala para encontrarla más rápido."}</span>
              </span>
              <span aria-hidden="true" className={`relative h-6 w-11 shrink-0 rounded-full p-1 transition-colors ${form.pinned ? "bg-primary" : "bg-surface-container-highest"}`}>
                <span className={`block h-4 w-4 rounded-full bg-surface-container-lowest shadow-sm transition-transform ${form.pinned ? "translate-x-5" : "translate-x-0"}`} />
              </span>
            </button>
          </section>

          {note && (
            <section className="rounded-2xl border border-error/25 bg-surface-container-lowest p-4 shadow-sm sm:p-5">
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-error-container text-error">
                  <Trash2 size={17} />
                </span>
                <div className="min-w-0">
                  <h2 className="font-headline-xs text-headline-xs font-semibold text-on-surface">Eliminar nota</h2>
                  <p className="mt-1 font-body-sm text-body-sm leading-5 text-on-surface-variant">Esta acción es permanente y no se puede deshacer.</p>
                </div>
              </div>
              {!confirmDelete ? (
                <button className="mt-4 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl border border-error/40 px-3 font-label-md text-label-md font-semibold text-error transition-colors hover:bg-error-container/60" onClick={() => setConfirmDelete(true)} type="button">
                  <Trash2 size={15} /> Eliminar nota
                </button>
              ) : (
                <div className="mt-4 rounded-xl bg-error-container/50 p-3">
                  <p className="font-body-sm text-body-sm font-semibold text-on-error-container">¿Eliminar esta nota definitivamente?</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-error px-3 font-label-md text-label-md font-semibold text-error-foreground disabled:cursor-wait disabled:opacity-60" disabled={saving} onClick={() => void remove()} type="button"><Trash2 size={14} /> Eliminar definitivamente</button>
                    <button className="min-h-10 rounded-lg px-3 font-label-md text-label-md text-on-error-container hover:bg-error-container" onClick={() => setConfirmDelete(false)} type="button">Cancelar</button>
                  </div>
                </div>
              )}
            </section>
          )}
        </aside>
      </div>

      {error && (
        <div className="fixed inset-x-4 bottom-20 z-30 mx-auto max-w-xl rounded-xl border border-error bg-error-container px-4 py-3 font-body-sm text-body-sm text-on-error-container shadow-lg sm:inset-x-auto sm:bottom-6">
          {error}
        </div>
      )}
      {confirmLeave && (
        <ConfirmModal
          cancelLabel="Seguir editando"
          confirmLabel="Salir sin guardar"
          danger
          message={<>Tienes cambios sin guardar en esta nota. Si sales ahora, perderás esos cambios.</>}
          onClose={() => setConfirmLeave(false)}
          onConfirm={() => {
            setConfirmLeave(false);
            router.push(returnTo);
          }}
          title="¿Salir del editor?"
        />
      )}
    </section>
  );
}
