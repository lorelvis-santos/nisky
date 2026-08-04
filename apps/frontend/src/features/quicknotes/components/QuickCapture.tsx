"use client";

import { useCallback, useState } from "react";
import { CalendarClock } from "lucide-react";
import { toast } from "sonner";
import type { QuickNote } from "@/types/entities";
import { useQuickNoteMutations, useQuickNotesQuery } from "../hooks/useQuickNotes";
import { QuickNoteItem } from "./QuickNoteItem";
import { detectDate, type DetectedDate } from "../utils/detectDate";

export function QuickCapture({ onConvertToTask }: { onConvertToTask: (note: QuickNote, detected: DetectedDate | null) => void }) {
  const [draft, setDraft] = useState("");
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const query = useQuickNotesQuery("INBOX");
  const mutations = useQuickNoteMutations();
  const detected = draft.trim() ? detectDate(draft) : null;

  const save = useCallback(async () => {
    const content = draft.trim();
    if (!content || mutations.create.isPending) return;
    setSaveState("saving");
    try {
      await mutations.create.mutateAsync(content);
      setDraft("");
      setSaveState("saved");
      window.setTimeout(() => setSaveState("idle"), 1500);
    } catch {
      setSaveState("idle");
      toast.error("No se pudo guardar la captura");
    }
  }, [draft, mutations.create]);

  return (
    <div className="flex min-h-[250px] flex-col">
      <div className="flex flex-1 flex-col gap-2 p-3">
        <textarea aria-label="Nota rápida" className="min-h-28 flex-1 resize-none border-0 bg-transparent p-0 font-body-sm text-body-sm text-on-surface outline-none placeholder:text-on-surface-variant focus:ring-0" onChange={(event) => { setDraft(event.target.value); setSaveState("idle"); }} onKeyDown={(event) => { if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) { event.preventDefault(); void save(); } }} placeholder="Escribe algo para revisarlo después..." value={draft} />
        {detected && <span className="inline-flex items-center gap-1 font-data-mono text-data-mono text-xs text-tertiary"><CalendarClock size={12} /> Fecha detectada: {detected.label}</span>}
        <div className="flex items-center justify-between gap-3 border-t border-outline-variant pt-3">
          <span className="font-body-sm text-body-sm text-on-surface-variant">{saveState === "saving" ? "Guardando..." : saveState === "saved" ? "Guardado" : `${draft.length} caracteres`}</span>
          <button className="bg-primary-container px-3 py-2 font-body-sm text-body-sm text-on-primary hover:bg-primary disabled:cursor-not-allowed disabled:opacity-50" disabled={!draft.trim() || saveState === "saving"} onClick={() => void save()} type="button">Guardar captura</button>
        </div>
      </div>
      {query.isError ? (
        <p className="border-t border-outline-variant p-3 font-body-sm text-body-sm text-error">No se pudieron cargar las capturas.</p>
      ) : (query.data ?? []).length > 0 && (
        <div className="border-t border-outline-variant p-3">
          <p className="mb-2 font-label-caps text-label-caps text-on-surface-variant">BANDEJA DE ENTRADA</p>
          <div className="max-h-[220px] overflow-y-auto">{(query.data ?? []).map((note) => <QuickNoteItem key={note.id} note={note} onConvertToTask={onConvertToTask} />)}</div>
        </div>
      )}
    </div>
  );
}
