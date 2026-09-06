"use client";

import { useState } from "react";
import { toast } from "sonner";
import { BookOpen } from "lucide-react";
import { KnowledgeSidebar } from "@/features/knowledge/components/KnowledgeSidebar";
import type { KnowledgeFilter } from "@/features/knowledge/components/KnowledgeSidebar";
import { NoteCard } from "@/features/knowledge/components/NoteCard";
import { NoteEditorModal } from "@/features/knowledge/components/NoteEditorModal";
import { NotePagination } from "@/features/knowledge/components/NotePagination";
import { useFacetsQuery, useNoteMutations, useNotesQuery } from "@/features/knowledge/hooks/useKnowledge";
import type { NoteForm } from "@/features/knowledge/schemas/knowledge.schema";
import type { Note } from "@/types/entities";

export default function KnowledgePage() {
  const [filter, setFilter] = useState<KnowledgeFilter>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<Note | null>(null);
  const [creating, setCreating] = useState(false);

  const query = useNotesQuery({
    page,
    q: search || undefined,
    category: filter?.type === "category" ? filter.name : undefined,
    tag: filter?.type === "tag" ? filter.name : undefined,
    limit: 20,
  });
  const facetsQuery = useFacetsQuery();
  const mutations = useNoteMutations();

  const notes = query.data?.data ?? [];
  const modalOpen = creating || Boolean(editing);

  const updateFilter = (nextFilter: KnowledgeFilter) => {
    setPage(1);
    setFilter(nextFilter);
  };

  const updateSearch = (value: string) => {
    setPage(1);
    setSearch(value);
  };

  const save = async (form: NoteForm) => {
    if (creating) {
      await mutations.create.mutateAsync(form);
      toast.success("¡Nota creada!");
    } else if (editing) {
      await mutations.update.mutateAsync({ id: editing.id, payload: form });
      toast.success("¡Nota actualizada!");
    }
    setEditing(null);
    setCreating(false);
  };

  const remove = async () => {
    if (!editing) return;
    await mutations.remove.mutateAsync(editing.id);
    toast.success("¡Nota eliminada!");
    setEditing(null);
    setCreating(false);
  };

  const togglePin = async (note: Note) => {
    try {
      await mutations.togglePin.mutateAsync({ id: note.id, pinned: !note.pinned });
    } catch {
      toast.error("Ups, no pudimos actualizar tu nota.");
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
    <section className="flex h-full min-h-0 flex-col bg-background">
      <div className="flex shrink-0 flex-col gap-4 bg-transparent p-container-padding sm:flex-row sm:items-end sm:justify-between sm:px-6 sm:pb-0 sm:pt-8 lg:px-10">
        <div>
          <p className="font-label-caps text-label-caps uppercase text-on-surface-variant">MIS NOTAS</p>
          <h1 className="mt-1 font-display-hero-mobile text-display-hero-mobile text-on-surface sm:font-display-hero sm:text-display-hero">Notas y referencias</h1>
        </div>
        <div className="flex w-full items-center gap-3 sm:w-auto">
          <input
            className="field h-10 w-full rounded-full border-0 bg-surface-container-lowest px-4 shadow-sm sm:w-56"
            onChange={(event) => updateSearch(event.target.value)}
            placeholder="Buscar notas..."
            value={search}
          />
          <button className="shrink-0 rounded-lg bg-primary px-4 py-2 font-body-sm text-body-sm text-on-primary shadow-sm hover:bg-primary-container" onClick={openNew} type="button">
            Nueva nota
          </button>
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {query.isLoading ? (
          <div className="flex h-full items-center justify-center font-body-sm text-body-sm text-on-surface-variant">Cargando notas...</div>
        ) : query.isError ? (
          <div className="flex h-full items-center justify-center font-body-sm text-body-sm text-error">Ups, no pudimos cargar tus notas. Inténtalo de nuevo.</div>
        ) : (
          <div className="grid grid-cols-1 gap-4 p-container-padding sm:gap-6 sm:px-6 lg:grid-cols-[16rem_minmax(0,1fr)] lg:px-10">
             <KnowledgeSidebar active={filter} facets={facetsQuery.data} onFilter={updateFilter} />
             <div className="min-w-0">
             {notes.length === 0 ? (
               <div className="flex min-h-[16rem] flex-col items-center justify-center gap-2 rounded-lg border border-outline-variant/70 bg-surface-container-lowest p-section-gap text-center shadow-sm">
                <BookOpen className="text-primary" size={28} />
                <p className="font-label-caps text-label-caps text-on-surface-variant">MIS NOTAS</p>
                <p className="max-w-xl font-body-sm text-body-sm text-on-surface-variant">
                  {filter || search ? "No encontramos notas con esa búsqueda." : "Guarda aquí tus notas, referencias e ideas."}
                </p>
                {!filter && !search && (
                   <button className="mt-2 rounded-md bg-primary-container px-4 py-2 font-body-sm text-body-sm text-on-primary hover:bg-primary" onClick={openNew} type="button">
                    Nueva nota
                  </button>
                )}
              </div>
             ) : (
               <>
                 <div className="grid grid-cols-1 content-start gap-4 sm:grid-cols-2 xl:grid-cols-3">
                   {notes.map((note) => (
                     <NoteCard key={note.id} note={note} onEdit={openEdit} onTogglePin={togglePin} />
                   ))}
                 </div>
                 <NotePagination isFetching={query.isFetching} meta={query.data?.meta} onPageChange={setPage} />
               </>
             )}
             </div>
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
