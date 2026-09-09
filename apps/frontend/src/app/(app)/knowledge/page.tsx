"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { BookOpen, Plus } from "lucide-react";
import { FAB } from "@/components/ui/FAB";
import { KnowledgeSidebar } from "@/features/knowledge/components/KnowledgeSidebar";
import type { KnowledgeFilter } from "@/features/knowledge/components/KnowledgeSidebar";
import { NoteCard } from "@/features/knowledge/components/NoteCard";
import { NotePreviewModal } from "@/features/knowledge/components/NotePreviewModal";
import { NotePagination } from "@/features/knowledge/components/NotePagination";
import { useFacetsQuery, useNoteMutations, useNotesQuery } from "@/features/knowledge/hooks/useKnowledge";
import type { Note } from "@/types/entities";

export default function KnowledgePage() {
  const router = useRouter();
  const [filter, setFilter] = useState<KnowledgeFilter>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [previewing, setPreviewing] = useState<Note | null>(null);

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
  const updateFilter = (nextFilter: KnowledgeFilter) => {
    setPage(1);
    setFilter(nextFilter);
  };

  const updateSearch = (value: string) => {
    setPage(1);
    setSearch(value);
  };

  const togglePin = async (note: Note, pinned = !note.pinned) => {
    try {
      await mutations.togglePin.mutateAsync({ id: note.id, pinned });
      return true;
    } catch {
      toast.error("Ups, no pudimos actualizar tu nota.");
      return false;
    }
  };

  const removePreview = async () => {
    if (!previewing) return;
    await mutations.remove.mutateAsync(previewing.id);
    toast.success("¡Nota eliminada!");
    setPreviewing(null);
  };

  const openNew = () => {
    router.push(`/knowledge/new?returnTo=${encodeURIComponent("/knowledge")}`);
  };

  const openPreview = (note: Note) => {
    setPreviewing(note);
  };

  const openEdit = (note: Note) => {
    router.push(`/knowledge/${note.id}/edit?returnTo=${encodeURIComponent("/knowledge")}`);
  };

  const closePreview = () => setPreviewing(null);

  return (
    <section className="h-full min-h-0 overflow-y-auto bg-background">
      <div className="flex flex-col gap-4 bg-transparent p-container-padding sm:flex-row sm:items-end sm:justify-between sm:px-6 sm:pb-0 sm:pt-8 lg:px-10">
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
          <button className="hidden shrink-0 items-center gap-2 rounded-lg bg-primary px-4 py-2 font-body-sm text-body-sm text-on-primary shadow-sm hover:bg-primary-container sm:inline-flex" onClick={openNew} type="button">
            <Plus size={16} /> Nueva nota
          </button>
        </div>
      </div>
      <div>
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
               </div>
             ) : (
               <>
                 <div className="grid grid-cols-1 content-start gap-4 sm:grid-cols-2 xl:grid-cols-3">
                   {notes.map((note) => (
                       <NoteCard key={note.id} note={note} onEdit={openEdit} onOpen={openPreview} onTogglePin={async (item) => { await togglePin(item); }} />
                   ))}
                 </div>
                 <NotePagination isFetching={query.isFetching} meta={query.data?.meta} onPageChange={setPage} />
               </>
             )}
             </div>
           </div>
        )}
      </div>
       <div className="sm:hidden">
          <FAB ariaLabel="Nueva nota" onClick={openNew} raised={Boolean(previewing)} />
        </div>
        {previewing && (
          <NotePreviewModal
            key={previewing.id}
             note={previewing}
             onClose={closePreview}
             onDelete={removePreview}
             onEdit={() => openEdit(previewing)}
             onTogglePin={(pinned) => togglePin(previewing, pinned)}
           />
         )}
     </section>
  );
}
