"use client";

import { CalendarDays, Plus } from "lucide-react";
import type { JournalEntry } from "@/types/entities";

function entryDate(value: string) {
  return new Date(value).toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" });
}

export function JournalSidebar({
  entries,
  selectedId,
  creating,
  onSelect,
  onNew,
}: {
  entries: JournalEntry[];
  selectedId: string | null;
  creating: boolean;
  onSelect: (id: string) => void;
  onNew: () => void;
}) {
  return (
    <aside className="flex min-h-0 flex-col overflow-hidden rounded-lg border border-outline-variant bg-surface shadow-cadence-1 lg:h-full">
      <div className="flex shrink-0 items-center justify-between border-b border-outline-variant bg-surface-container-low p-container-padding">
        <span className="font-label-caps text-label-caps text-on-surface-variant">MIS ENTRADAS</span>
        <button aria-label="Nueva entrada" className="flex h-11 w-11 items-center justify-center rounded-md bg-primary text-on-primary shadow-cadence-1 transition-colors hover:bg-primary/90 lg:h-10 lg:w-10" onClick={onNew} type="button">
          <Plus size={18} />
        </button>
      </div>
      <div className="max-h-52 min-h-0 flex-1 overflow-y-auto lg:max-h-none">
        {entries.length === 0 ? (
          <p className="p-container-padding font-body-sm text-body-sm text-on-surface-variant">Tus entradas aparecerán aquí.</p>
        ) : (
          <ul>
            {entries.map((entry) => {
              const active = creating ? false : entry.id === selectedId;
              return (
                <li key={entry.id}>
                  <button
                    className={`flex min-h-16 w-full flex-col gap-1 rounded-md border-b border-l-2 border-outline-variant px-container-padding py-3 text-left transition-colors hover:bg-surface-container-low ${active ? "border-l-secondary bg-secondary-container/40" : "border-l-transparent"}`}
                    onClick={() => onSelect(entry.id)}
                    type="button"
                  >
                    <span className="truncate font-body-sm text-body-sm font-medium text-on-surface">{entry.title}</span>
                    <span className="flex items-center gap-1 font-data-mono text-data-mono text-xs text-on-surface-variant">
                      <CalendarDays size={11} />
                      {entryDate(entry.createdAt)}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </aside>
  );
}
