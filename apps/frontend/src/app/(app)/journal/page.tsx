"use client";

import { useState } from "react";
import { toast } from "sonner";
import { NotebookPen } from "lucide-react";
import { JournalEditor } from "@/features/journal/components/JournalEditor";
import { JournalLocked } from "@/features/journal/components/JournalLocked";
import { JournalPreviewModal } from "@/features/journal/components/JournalPreviewModal";
import { JournalSidebar } from "@/features/journal/components/JournalSidebar";
import { useJournalMutations, useJournalQuery } from "@/features/journal/hooks/useJournal";
import type { JournalEntryForm } from "@/features/journal/schemas/journal.schema";
import type { ApiError } from "@/types/api.types";
import type { JournalEntry } from "@/types/entities";

function isForbidden(error: unknown) {
  return Boolean(error && typeof error === "object" && (error as ApiError).code === "FORBIDDEN");
}

export default function JournalPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [previewing, setPreviewing] = useState<JournalEntry | null>(null);
  const query = useJournalQuery({ limit: 50 });
  const mutations = useJournalMutations();

  const entries = query.data?.data ?? [];
  const selected = entries.find((entry) => entry.id === selectedId) ?? null;

  if (query.isLoading) {
    return <div className="flex h-full items-center justify-center bg-background font-body-sm text-body-sm text-on-surface-variant">Cargando diario...</div>;
  }

  if (query.isError) {
    if (isForbidden(query.error)) return <JournalLocked />;
    return <div className="flex h-full items-center justify-center bg-background font-body-sm text-body-sm text-error">Ups, no pudimos abrir tu diario. Inténtalo de nuevo en un momento.</div>;
  }

  const openNew = () => {
    setPreviewing(null);
    setSelectedId(null);
    setCreating(true);
  };

  const openEntry = (id: string) => {
    const entry = entries.find((item) => item.id === id);
    if (!entry) return;
    setCreating(false);
    setSelectedId(id);
    setPreviewing(entry);
  };

  const save = async (form: JournalEntryForm) => {
    if (creating) {
      const created = await mutations.create.mutateAsync(form);
      toast.success("¡Entrada guardada!");
      setCreating(false);
      setSelectedId(created.id);
      setPreviewing(null);
    } else if (selected) {
      await mutations.update.mutateAsync({ id: selected.id, payload: form });
      toast.success("¡Entrada actualizada!");
    }
  };

  const remove = async () => {
    if (!selected) return;
    await mutations.remove.mutateAsync(selected.id);
    toast.success("¡Entrada eliminada!");
    setSelectedId(null);
    setCreating(false);
    setPreviewing(null);
  };

  const openEdit = (entry: JournalEntry) => {
    setPreviewing(null);
    setCreating(false);
    setSelectedId(entry.id);
  };

  const closePreview = () => {
    setPreviewing(null);
    setSelectedId(null);
  };

  const editing = previewing ? null : selected;

  return (
    <section className="flex h-full min-h-0 flex-col bg-background">
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-section-gap p-container-padding sm:p-section-gap lg:grid-cols-[20rem_1fr]">
        {editing || creating ? (
          <>
            <div className="hidden lg:block">
              <JournalSidebar
                creating={creating}
                entries={entries}
                onNew={openNew}
                onSelect={openEntry}
                selectedId={selectedId}
              />
            </div>
            <JournalEditor
              entry={editing}
              key={creating ? "new" : editing?.id}
              onBack={() => {
                setSelectedId(null);
                setCreating(false);
              }}
              onDelete={selected ? remove : undefined}
              onSave={save}
            />
          </>
        ) : (
          <>
            <JournalSidebar
              creating={creating}
              entries={entries}
              onNew={openNew}
              onSelect={openEntry}
              selectedId={selectedId}
            />
            <article className="flex min-h-[20rem] flex-col items-center justify-center gap-2 rounded-lg border border-outline-variant bg-surface p-section-gap text-center shadow-cadence-1">
              <NotebookPen className="text-primary" size={28} />
              <p className="font-label-caps text-label-caps text-on-surface-variant">MI DIARIO</p>
              <h1 className="font-headline-md text-headline-md text-on-surface">Una pausa para pensar</h1>
              <p className="max-w-xl font-body-sm text-body-sm text-on-surface-variant">
                Escribe tranquilo: tus entradas solo se abren para ti, y solo mientras estás conectado.
              </p>
              <button className="mt-2 min-h-11 rounded-md bg-primary px-4 py-2 font-body-sm text-body-sm text-on-primary shadow-cadence-1 transition-colors hover:bg-primary/90" onClick={openNew} type="button">
                Nueva entrada
              </button>
            </article>
          </>
        )}
      </div>
      {previewing && <JournalPreviewModal entry={previewing} onClose={closePreview} onEdit={() => openEdit(previewing)} />}
    </section>
  );
}
