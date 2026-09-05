"use client";

import { StickyNote, ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useQuickNotesQuery } from "@/features/quicknotes/hooks/useQuickNotes";
import { QuickNoteItem } from "@/features/quicknotes/components/QuickNoteItem";
import { QuickNoteManager } from "@/features/quicknotes/components/QuickNoteManager";
import type { DetectedDate } from "@/features/quicknotes/utils/detectDate";
import type { QuickNote } from "@/types/entities";

export function QuickNotesPanel() {
  const router = useRouter();
  const [managerOpen, setManagerOpen] = useState(false);
  const query = useQuickNotesQuery("INBOX", 50);
  const notes = (query.data ?? []).filter((note) => note.status === "INBOX");
  const visible = notes.slice(0, 8);

  const convertToTask = (note: QuickNote, detected: DetectedDate | null) => {
    const prefill = encodeURIComponent(
      JSON.stringify({ title: note.content, dueDate: detected?.isoDate ?? "" }),
    );
    router.push(
      `/tasks?modal=create&prefill=${prefill}&quickNoteId=${encodeURIComponent(note.id)}`,
    );
  };

  if (notes.length === 0) return null;

  return (
    <div className="border border-outline-variant bg-surface-container-lowest">
      <div className="flex items-center justify-between gap-2 border-b border-outline-variant bg-surface-bright px-4 py-3">
        <div className="flex items-center gap-2">
          <StickyNote size={17} className="text-primary" />
          <div>
            <h2 className="font-headline-xs text-headline-xs font-bold text-primary">
              Notas rápidas sin revisar ({notes.length})
            </h2>
            <p className="mt-0.5 font-body-sm text-body-sm text-on-surface-variant">
              Pendientes de revisar, archivar o convertir en tarea.
            </p>
          </div>
        </div>
        {notes.length > 8 && (
          <button
            className="flex items-center gap-1 font-label-caps text-label-caps text-primary hover:underline"
            onClick={() => setManagerOpen(true)}
            type="button"
          >
            VER TODAS ({notes.length}) <ArrowRight size={13} />
          </button>
        )}
      </div>
      <div className="px-4 py-2">
        {visible.map((note) => (
          <QuickNoteItem key={note.id} note={note} onConvertToTask={convertToTask} />
        ))}
      </div>
      {managerOpen && (
        <QuickNoteManager
          onClose={() => setManagerOpen(false)}
          onConvertToTask={convertToTask}
          view="inbox"
        />
      )}
    </div>
  );
}