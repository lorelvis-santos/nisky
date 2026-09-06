"use client";

import { Inbox, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { FAB } from "@/components/ui/FAB";
import { useCapture } from "@/context/CaptureContext";
import { QuickNoteItem } from "@/features/quicknotes/components/QuickNoteItem";
import { QuickNotePreviewModal } from "@/features/quicknotes/components/QuickNotePreviewModal";
import { useQuickNotesQuery } from "@/features/quicknotes/hooks/useQuickNotes";
import type { DetectedDate } from "@/features/quicknotes/utils/detectDate";
import type { QuickNote, QuickNoteStatus } from "@/types/entities";

export default function QuickNotesPage() {
  const router = useRouter();
  const capture = useCapture();
  const [view, setView] = useState<QuickNoteStatus>("INBOX");
  const [previewing, setPreviewing] = useState<QuickNote | null>(null);
  const inboxQuery = useQuickNotesQuery("INBOX", 50);
  const archivedQuery = useQuickNotesQuery("ARCHIVED", 50);
  const currentQuery = view === "INBOX" ? inboxQuery : archivedQuery;
  const notes = currentQuery.data ?? [];

  const createTaskFromCapture = (note: QuickNote, detected: DetectedDate | null) => {
    const prefill = encodeURIComponent(JSON.stringify({
      title: note.content,
      dueDate: detected?.isoDate ?? "",
    }));
    setPreviewing(null);
    router.push(`/tasks?modal=create&prefill=${prefill}&quickNoteId=${encodeURIComponent(note.id)}`);
  };

  const openCapture = () => capture.open("QUICK_NOTE");
  const openPreview = (note: QuickNote) => setPreviewing(note);

  return (
    <section className="h-full min-h-0 overflow-y-auto bg-background">
      <header className="mx-auto flex w-full max-w-6xl flex-col gap-4 bg-transparent p-container-padding sm:flex-row sm:items-end sm:justify-between sm:px-6 sm:pb-0 sm:pt-8 lg:px-10">
        <div>
          <p className="font-label-caps text-label-caps uppercase text-on-surface-variant">CAPTURAS RÁPIDAS</p>
          <h1 className="mt-1 font-display-hero-mobile text-display-hero-mobile text-on-surface sm:font-display-hero sm:text-display-hero">{view === "INBOX" ? "Bandeja de entrada" : "Capturas archivadas"}</h1>
          <p className="mt-2 max-w-xl font-body-sm text-body-sm text-on-surface-variant">{view === "INBOX" ? "Captura ideas y decide qué hacer con ellas después." : "Revisa las capturas que archivaste."}</p>
        </div>
        <div className="hidden w-full items-center justify-end gap-2 sm:flex sm:w-auto">
          <button className="inline-flex min-h-11 items-center gap-2 rounded-md bg-primary px-3.5 font-body-sm text-body-sm text-on-primary transition-colors hover:bg-primary/90" onClick={openCapture} type="button">
            <Plus size={16} /> Nueva captura
          </button>
        </div>
      </header>

      <div>
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 p-container-padding pb-24 sm:px-6 sm:py-8 lg:px-10">
          <div className="grid grid-cols-2 gap-1 rounded-lg border border-outline-variant bg-surface-container-low p-1" role="tablist" aria-label="Estado de las capturas">
            {([
              ["INBOX", "Pendientes", inboxQuery.data?.length ?? 0],
              ["ARCHIVED", "Archivadas", archivedQuery.data?.length ?? 0],
            ] as const).map(([value, label, count]) => (
              <button
                aria-selected={view === value}
                className={`flex min-h-11 items-center justify-center gap-2 rounded-lg px-3 font-label-md text-label-md transition-colors ${view === value ? "bg-primary text-on-primary shadow-cadence-1" : "text-on-surface-variant hover:bg-surface-container-lowest hover:text-on-surface"}`}
                key={value}
                onClick={() => setView(value)}
                role="tab"
                type="button"
              >
                {label}
                <span className={view === value ? "text-on-primary/75" : "text-on-surface-variant/70"}>{count}</span>
              </button>
            ))}
          </div>

          {currentQuery.isLoading ? (
            <div className="rounded-lg border border-outline-variant bg-surface-container-lowest p-8 text-center font-body-sm text-body-sm text-on-surface-variant">Cargando capturas...</div>
          ) : currentQuery.isError ? (
            <div className="flex flex-col items-center gap-3 rounded-lg border border-error bg-error-container p-8 text-center font-body-sm text-body-sm text-on-error-container">
              <p>No pudimos cargar tus capturas.</p>
               <button className="rounded-md px-2 py-1 font-label-md text-label-md underline underline-offset-2 hover:bg-error-container/40" onClick={() => void currentQuery.refetch()} type="button">Reintentar</button>
            </div>
          ) : notes.length === 0 ? (
            <div className="flex min-h-[16rem] flex-col items-center justify-center gap-2 rounded-lg border border-outline-variant bg-surface-container-lowest p-8 text-center shadow-sm">
              <Inbox className="text-primary" size={28} />
              <p className="font-label-caps text-label-caps text-on-surface-variant">{view === "INBOX" ? "BANDEJA DESPEJADA" : "SIN ARCHIVO"}</p>
              <p className="max-w-md font-body-sm text-body-sm text-on-surface-variant">{view === "INBOX" ? "Captura una idea cuando aparezca y procésala después." : "Las capturas que archives aparecerán aquí."}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 divide-y divide-outline-variant rounded-lg border border-outline-variant bg-surface-container-lowest px-4 shadow-sm sm:px-5 lg:grid-cols-2 lg:gap-4 lg:divide-y-0 lg:rounded-none lg:border-0 lg:bg-transparent lg:px-0 lg:shadow-none">
              {notes.map((note) => (
                 <QuickNoteItem
                   archived={view === "ARCHIVED"}
                   key={note.id}
                   note={note}
                   onOpen={openPreview}
                   onConvertToTask={view === "INBOX" ? createTaskFromCapture : undefined}
                 />
              ))}
            </div>
          )}

        </div>
      </div>
      {previewing && (
        <QuickNotePreviewModal
          note={previewing}
          onClose={() => setPreviewing(null)}
          onConvertToTask={view === "INBOX" ? createTaskFromCapture : undefined}
        />
      )}
      <div className="sm:hidden">
        <FAB ariaLabel="Nueva captura" onClick={openCapture} raised={capture.isOpen || Boolean(previewing)} />
      </div>
    </section>
  );
}
