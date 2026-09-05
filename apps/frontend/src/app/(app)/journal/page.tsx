"use client";

import { useState } from "react";
import { toast } from "sonner";
import { NotebookPen } from "lucide-react";
import { JournalEditor } from "@/features/journal/components/JournalEditor";
import { JournalLocked } from "@/features/journal/components/JournalLocked";
import { JournalSidebar } from "@/features/journal/components/JournalSidebar";
import { useJournalMutations, useJournalQuery } from "@/features/journal/hooks/useJournal";
import type { JournalEntryForm } from "@/features/journal/schemas/journal.schema";
import type { ApiError } from "@/types/api.types";

function isForbidden(error: unknown) {
  return Boolean(error && typeof error === "object" && (error as ApiError).code === "FORBIDDEN");
}

export default function JournalPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const query = useJournalQuery({ limit: 50 });
  const mutations = useJournalMutations();

  const entries = query.data?.data ?? [];
  const selected = entries.find((entry) => entry.id === selectedId) ?? null;

  if (query.isLoading) {
    return <div className="flex h-full items-center justify-center font-body-sm text-body-sm text-on-surface-variant">Cargando diario...</div>;
  }

  if (query.isError) {
    if (isForbidden(query.error)) return <JournalLocked />;
    return <div className="flex h-full items-center justify-center font-body-sm text-body-sm text-error">Ups, no pudimos abrir tu diario. Inténtalo de nuevo en un momento.</div>;
  }

  const openNew = () => {
    setSelectedId(null);
    setCreating(true);
  };

  const openEntry = (id: string) => {
    setCreating(false);
    setSelectedId(id);
  };

  const save = async (form: JournalEntryForm) => {
    if (creating) {
      const created = await mutations.create.mutateAsync(form);
      toast.success("¡Entrada guardada!");
      setCreating(false);
      setSelectedId(created.id);
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
  };

  const editing = selected;

  return (
    <section className="flex h-full min-h-0 flex-col bg-surface">
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-section-gap p-container-padding lg:grid-cols-[20rem_1fr]">
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
            <article className="flex min-h-[20rem] flex-col items-center justify-center gap-2 border border-outline-variant bg-surface-container-lowest p-section-gap text-center">
              <NotebookPen className="text-primary" size={28} />
              <p className="font-label-caps text-label-caps text-on-surface-variant">MI DIARIO</p>
              <h1 className="font-headline-sm text-headline-sm text-primary">Una pausa para pensar</h1>
              <p className="max-w-xl font-body-sm text-body-sm text-on-surface-variant">
                Escribe tranquilo: tus entradas solo se abren para ti, y solo mientras estás conectado.
              </p>
              <button className="mt-2 bg-primary-container px-4 py-2 font-body-sm text-body-sm text-on-primary hover:bg-primary" onClick={openNew} type="button">
                Nueva entrada
              </button>
            </article>
          </>
        )}
      </div>
    </section>
  );
}
