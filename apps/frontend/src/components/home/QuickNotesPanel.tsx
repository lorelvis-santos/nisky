"use client";

import Link from "next/link";
import { ChevronRight, StickyNote } from "lucide-react";
import { useQuickNotesQuery } from "@/features/quicknotes/hooks/useQuickNotes";

export function QuickNotesPanel() {
  const query = useQuickNotesQuery("INBOX", 50);
  const notes = (query.data ?? []).filter((note) => note.status === "INBOX");

  if (notes.length === 0) return null;

  return (
    <section className="pt-1">
      <Link
        className="group flex items-center justify-between rounded-lg bg-surface-container-lowest p-3 shadow-sm transition-colors hover:bg-surface-container-low"
        href="/quick-notes"
      >
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-surface-container text-on-surface-variant transition-colors group-hover:text-secondary">
            <StickyNote size={16} strokeWidth={1.8} />
          </span>
          <div className="min-w-0">
            <p className="font-body-sm text-body-sm font-medium text-on-surface">Capturas rápidas</p>
            <p className="mt-0.5 truncate font-label-md text-label-md text-on-surface-variant">
              {notes.length} {notes.length === 1 ? "nota rápida pendiente" : "notas rápidas pendientes"}
            </p>
          </div>
        </div>
        <ChevronRight className="shrink-0 text-on-surface-variant/60 transition-colors group-hover:text-on-surface" size={18} />
      </Link>
    </section>
  );
}
