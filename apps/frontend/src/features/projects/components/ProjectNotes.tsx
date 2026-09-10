"use client";

import { BookOpen, Plus } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { FAB } from "@/components/ui/FAB";
import { KnowledgeSidebar, type KnowledgeFilter } from "@/features/knowledge/components/KnowledgeSidebar";
import { NoteCard } from "@/features/knowledge/components/NoteCard";
import { NotePreviewModal } from "@/features/knowledge/components/NotePreviewModal";
import { NotePagination } from "@/features/knowledge/components/NotePagination";
import { useNoteMutations, useFacetsQuery, useNotesQuery } from "@/features/knowledge/hooks/useKnowledge";
import type { Note } from "@/types/entities";
import type { Project } from "@/types/entities";
import { useAuth } from "@/context/AuthProvider";

export function ProjectNotes({ project }: { project: Project }) {
  const router = useRouter();
  const { user } = useAuth();
  const [filter, setFilter] = useState<KnowledgeFilter>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [previewing, setPreviewing] = useState<Note | null>(null);
  const query = useNotesQuery({
    page,
    q: search.trim() || undefined,
    category: filter?.type === "category" ? filter.name : undefined,
    tag: filter?.type === "tag" ? filter.name : undefined,
    projectId: project.id,
    limit: 20,
  });
  const facetsQuery = useFacetsQuery(project.id);
  const mutations = useNoteMutations();
  const notes = query.data?.data ?? [];
  const hasFilters = Boolean(search) || Boolean(filter);

  const updateFilter = (nextFilter: KnowledgeFilter) => {
    setPage(1);
    setFilter(nextFilter);
  };

  const updateSearch = (value: string) => {
    setPage(1);
    setSearch(value);
  };

  const togglePin = async (note: Note, pinned = !note.pinned) => {
    if (note.user?.id !== user?.id) return;
    try {
      await mutations.togglePin.mutateAsync({ id: note.id, pinned });
      return true;
    } catch {
      toast.error("No pudimos actualizar la nota.");
      return false;
    }
  };

  const removePreview = async () => {
    if (!previewing || previewing.user?.id !== user?.id) return;
    await mutations.remove.mutateAsync(previewing.id);
    toast.success("Nota eliminada");
    setPreviewing(null);
  };

  const openNew = () => {
    const returnTo = `/projects/${project.id}?tab=notes`;
    router.push(`/knowledge/new?projectId=${encodeURIComponent(project.id)}&returnTo=${encodeURIComponent(returnTo)}`);
  };

  const openPreview = (note: Note) => {
    setPreviewing(note);
  };

  const openEdit = (note: Note) => {
    const returnTo = `/projects/${project.id}?tab=notes`;
    router.push(`/knowledge/${note.id}/edit?returnTo=${encodeURIComponent(returnTo)}`);
  };

  return (
    <section className="min-w-0">
      <header className="flex flex-col gap-4 bg-transparent sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-label-caps text-label-caps uppercase text-on-surface-variant">NOTAS DEL PROYECTO</p>
          <h2 className="mt-1 font-display-hero-mobile text-display-hero-mobile text-on-surface sm:font-display-hero sm:text-display-hero">Notas y referencias</h2>
          <p className="mt-2 max-w-xl font-body-sm text-body-sm text-on-surface-variant">Contexto compartido para las personas que trabajan en este proyecto.</p>
        </div>
        <div className="flex w-full items-center gap-3 sm:w-auto">
          <input
            aria-label="Buscar notas del proyecto"
            className="field h-10 w-full rounded-full border-0 bg-surface-container-lowest px-4 shadow-sm sm:w-56"
            onChange={(event) => updateSearch(event.target.value)}
            placeholder="Buscar notas..."
            type="search"
            value={search}
          />
          <button className="hidden h-10 shrink-0 items-center gap-2 rounded-md bg-primary px-4 py-2 font-body-sm text-body-sm text-on-primary shadow-sm transition-colors hover:bg-primary/90 sm:inline-flex" onClick={openNew} type="button">
            <Plus size={16} /> Nueva nota
          </button>
        </div>
      </header>

      <div className="mt-5 grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-[16rem_minmax(0,1fr)]">
        <KnowledgeSidebar active={filter} facets={facetsQuery.data} onFilter={updateFilter} />
        <div className="min-w-0">
          {query.isLoading ? (
            <div className="rounded-lg border border-outline-variant bg-surface-container-lowest p-8 text-center font-body-sm text-body-sm text-on-surface-variant">Cargando notas...</div>
          ) : query.isError ? (
            <div className="flex flex-col items-center gap-3 rounded-lg border border-error bg-error-container p-8 text-center font-body-sm text-body-sm text-on-error-container">
              <p>No pudimos cargar las notas del proyecto.</p>
               <button className="rounded-md px-2 py-1 font-label-md text-label-md underline underline-offset-2 hover:bg-error-container/30" onClick={() => void query.refetch()} type="button">Reintentar</button>
            </div>
          ) : notes.length === 0 ? (
            <div className="flex min-h-[16rem] flex-col items-center justify-center gap-2 rounded-lg border border-outline-variant/70 bg-surface-container-lowest p-8 text-center shadow-sm">
              <BookOpen className="text-primary" size={28} />
              <p className="font-label-caps text-label-caps text-on-surface-variant">NOTAS DEL PROYECTO</p>
              <p className="max-w-md font-body-sm text-body-sm text-on-surface-variant">{hasFilters ? "No encontramos notas con esa búsqueda." : "Guarda aquí el contexto y las referencias del proyecto."}</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 content-start gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {notes.map((note) => (
                    <NoteCard canEdit={note.user?.id === user?.id} canEditContent={note.user?.id === user?.id || note.collaboratorsCanEdit} key={note.id} note={note} onEdit={openEdit} onOpen={openPreview} onTogglePin={async (item) => { await togglePin(item); }} showAuthor />
                ))}
              </div>
              <NotePagination isFetching={query.isFetching} meta={query.data?.meta} onPageChange={setPage} />
            </>
          )}
        </div>
      </div>

      <div className="sm:hidden">
          <FAB ariaLabel="Nueva nota" onClick={openNew} raised={Boolean(previewing)} />
       </div>
       {previewing && (
         <NotePreviewModal
            key={previewing.id}
            note={previewing}
            onClose={() => setPreviewing(null)}
            onDelete={previewing.user?.id === user?.id ? removePreview : undefined}
             onEdit={previewing.user?.id === user?.id || previewing.collaboratorsCanEdit ? () => openEdit(previewing) : undefined}
            onTogglePin={previewing.user?.id === user?.id ? (pinned) => togglePin(previewing, pinned) : undefined}
          />
        )}
    </section>
  );
}
