"use client";

import { useState } from "react";
import { toast } from "sonner";
import { BookOpen } from "lucide-react";
import { KnowledgeSidebar } from "@/features/knowledge/components/KnowledgeSidebar";
import { NoteCard } from "@/features/knowledge/components/NoteCard";
import { NoteEditorModal } from "@/features/knowledge/components/NoteEditorModal";
import { useFacetsQuery, useNoteMutations, useNotesQuery } from "@/features/knowledge/hooks/useKnowledge";
import type { NoteForm } from "@/features/knowledge/schemas/knowledge.schema";
import type { Note } from "@/types/entities";

type Filter = { type: "category" | "tag"; name: string } | null;

export default function KnowledgePage() {
  const [filter, setFilter] = useState<Filter>(null);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Note | null>(null);
  const [creating, setCreating] = useState(false);

  const query = useNotesQuery({
    q: search || undefined,
    category: filter?.type === "category" ? filter.name : undefined,
    tag: filter?.type === "tag" ? filter.name : undefined,
    limit: 50,
  });
  const facetsQuery = useFacetsQuery();
  const mutations = useNoteMutations();

  const notes = query.data?.data ?? [];
  const modalOpen = creating || Boolean(editing);

  const save = async (form: NoteForm) => {
    if (creating) {
      await mutations.create.mutateAsync(form);
      toast.success("Nota creada");
    } else if (editing) {
      await mutations.update.mutateAsync({ id: editing.id, payload: form });
      toast.success("Nota actualizada");
    }
    setEditing(null);
    setCreating(false);
  };

  const remove = async () => {
    if (!editing) return;
    await mutations.remove.mutateAsync(editing.id);
    toast.success("Nota eliminada");
    setEditing(null);
    setCreating(false);
  };

  const togglePin = async (note: Note) => {
    try {
      await mutations.togglePin.mutateAsync({ id: note.id, pinned: !note.pinned });
    } catch {
      toast.error("No se pudo actualizar la nota");
    }
  };

  const openNew = () => {
    setEditing(null);
    setCreating(true);
  };

  const openEdit = (note: Note) => {
    setCreating(false);
    setEditing(note);
  };

  const closeModal = () => {
    setEditing(null);
    setCreating(false);
  };

  return (
    <section className="flex h-full min-h-0 flex-col bg-surface">
      <div className="flex shrink-0 flex-col gap-3 border-b border-outline-variant bg-surface-bright p-container-padding sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-label-caps text-label-caps uppercase text-on-surface-variant">BASE DE CONOCIMIENTO</p>
          <h1 className="mt-1 font-headline-sm text-headline-sm text-primary">Notas y referencias</h1>
        </div>
        <div className="flex items-center gap-3">
          <input
            className="field h-9 w-full sm:w-56"
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar notas..."
            value={search}
          />
          <button className="shrink-0 bg-primary-container px-4 py-2 font-body-sm text-body-sm text-on-primary hover:bg-primary" onClick={openNew} type="button">
            Nueva nota
          </button>
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {query.isLoading ? (
          <div className="flex h-full items-center justify-center font-body-sm text-body-sm text-on-surface-variant">Cargando notas...</div>
        ) : query.isError ? (
          <div className="flex h-full items-center justify-center font-body-sm text-body-sm text-error">No se pudieron cargar las notas.</div>
        ) : (
          <div className="grid grid-cols-1 gap-section-gap p-container-padding lg:grid-cols-[16rem_1fr]">
            <KnowledgeSidebar active={filter} facets={facetsQuery.data} onFilter={setFilter} />
            {notes.length === 0 ? (
              <div className="flex min-h-[16rem] flex-col items-center justify-center gap-2 border border-outline-variant bg-surface-container-lowest p-section-gap text-center">
                <BookOpen className="text-primary" size={28} />
                <p className="font-label-caps text-label-caps text-on-surface-variant">BASE DE CONOCIMIENTO</p>
                <p className="max-w-xl font-body-sm text-body-sm text-on-surface-variant">
                  {filter || search ? "No hay notas que coincidan con los filtros." : "Guarda aquí tus notas, referencias e ideas."}
                </p>
                {!filter && !search && (
                  <button className="mt-2 bg-primary-container px-4 py-2 font-body-sm text-body-sm text-on-primary hover:bg-primary" onClick={openNew} type="button">
                    Nueva nota
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 content-start gap-section-gap sm:grid-cols-2 xl:grid-cols-3">
                {notes.map((note) => (
                  <NoteCard key={note.id} note={note} onEdit={openEdit} onTogglePin={togglePin} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      {modalOpen && (
        <NoteEditorModal
          key={editing?.id ?? "new"}
          note={editing}
          onClose={closeModal}
          onDelete={editing ? remove : undefined}
          onSave={save}
        />
      )}
    </section>
  );
}
