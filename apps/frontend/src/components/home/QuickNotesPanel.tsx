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
  const visible = notes.slice(0, 3);

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
    <section className="rounded-2xl border border-outline-variant/70 bg-surface-container-lowest shadow-sm">
      <div className="flex items-center justify-between gap-3 p-4">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-secondary-fixed text-secondary">
            <StickyNote size={16} />
          </span>
          <div>
            <h2 className="font-headline-xs text-headline-xs font-bold text-on-surface">Bandeja de notas</h2>
            <p className="mt-0.5 font-body-sm text-body-sm text-on-surface-variant">
              {notes.length} {notes.length === 1 ? "nota rápida pendiente" : "notas rápidas pendientes"}
            </p>
          </div>
        </div>
        {notes.length > visible.length ? (
          <button
            className="flex shrink-0 items-center gap-1 font-label-caps text-label-caps text-primary hover:underline"
            onClick={() => setManagerOpen(true)}
            type="button"
          >
            VER TODAS <ArrowRight size={13} />
          </button>
        ) : (
          <button
            className="flex shrink-0 items-center gap-1 font-label-caps text-label-caps text-primary hover:underline"
            onClick={() => router.push("/knowledge")}
            type="button"
          >
            VER BANDEJA <ArrowRight size={13} />
          </button>
        )}
      </div>
      <div className="border-t border-outline-variant px-3 py-2">
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
    </section>
  );
}
