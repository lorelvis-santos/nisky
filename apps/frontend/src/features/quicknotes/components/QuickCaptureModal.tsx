"use client";

import { StickyNote, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useModalScrollLock } from "@/hooks/useModalScrollLock";
import { QuickCapture } from "./QuickCapture";
import type { DetectedDate } from "../utils/detectDate";
import type { QuickNote } from "@/types/entities";

export function QuickCaptureModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();

  const convertToTask = (note: QuickNote, detected: DetectedDate | null) => {
    const prefill = encodeURIComponent(JSON.stringify({ title: note.content, dueDate: detected?.isoDate ?? "" }));
    onClose();
    router.push(`/tasks?modal=create&prefill=${prefill}&quickNoteId=${encodeURIComponent(note.id)}`);
  };

  if (!open) return null;
  return <ModalBody onClose={onClose} onConvertToTask={convertToTask} />;
}

function ModalBody({ onClose, onConvertToTask }: { onClose: () => void; onConvertToTask: (note: QuickNote, detected: DetectedDate | null) => void }) {
  useModalScrollLock();
  return (
    <div aria-modal="true" className="fixed inset-0 z-[60] flex items-center justify-center bg-on-surface/20 p-4 backdrop-blur-[1px]" role="dialog">
      <div className="flex max-h-[85vh] w-full max-w-lg flex-col border border-outline-variant bg-surface">
        <div className="flex items-center justify-between border-b border-outline-variant bg-surface-bright px-5 py-4">
          <div className="flex items-center gap-2">
            <StickyNote size={17} className="text-primary" />
            <div>
              <p className="font-label-caps text-label-caps uppercase text-on-surface-variant">NOTA RÁPIDA</p>
              <h2 className="mt-0.5 font-headline-xs text-headline-xs font-bold text-primary">Escribe algo para revisarlo después</h2>
            </div>
          </div>
          <button aria-label="Cerrar" className="text-on-surface-variant hover:text-on-surface" onClick={onClose} type="button"><X size={19} /></button>
        </div>
        <div className="min-h-0 overflow-y-auto" data-modal-scroll>
          <QuickCapture onConvertToTask={onConvertToTask} />
        </div>
      </div>
    </div>
  );
}
