"use client";

import { X } from "lucide-react";
import { FeedbackForm } from "@/components/feedback/FeedbackForm";
import { useModalScrollLock } from "@/hooks/useModalScrollLock";

export function FeedbackModal({ onClose }: { onClose: () => void }) {
  useModalScrollLock();
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-on-surface/20 p-4 backdrop-blur-[1px]"
      onClick={onClose}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-md flex-col overflow-y-auto border border-outline-variant bg-surface p-container-padding"
        data-modal-scroll
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <p className="font-headline-sm text-headline-sm">Enviar feedback</p>
          <button
            aria-label="Cerrar"
            className="text-on-surface-variant hover:text-on-surface"
            onClick={onClose}
            type="button"
          >
            <X size={20} />
          </button>
        </div>
        <FeedbackForm />
      </div>
    </div>
  );
}
