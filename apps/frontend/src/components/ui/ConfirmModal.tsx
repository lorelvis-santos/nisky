"use client";

import type { ReactNode } from "react";
import { useModalScrollLock } from "@/hooks/useModalScrollLock";

export function ConfirmModal({
  title,
  message,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  danger = false,
  loading = false,
  onConfirm,
  onClose,
}: {
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  useModalScrollLock();
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-on-surface/20 p-4 backdrop-blur-[1px]" onClick={onClose}>
      <div className="w-full max-w-md border border-outline-variant bg-surface p-container-padding" data-modal-scroll onClick={(e) => e.stopPropagation()}>
        <h2 className="font-headline-xs text-headline-xs">{title}</h2>
        <div className="mt-3 font-body-md text-body-md text-on-surface-variant">{message}</div>
        <div className="mt-5 flex justify-end gap-2">
          <button className="border border-outline-variant px-4 py-2 font-body-md text-body-md text-on-surface-variant hover:bg-surface-container-low disabled:opacity-50" disabled={loading} onClick={onClose} type="button">
            {cancelLabel}
          </button>
          <button
            className={`${danger ? "bg-error text-error-foreground hover:bg-error/90" : "bg-primary-container text-on-primary hover:bg-primary"} px-4 py-2 font-body-md text-body-md disabled:opacity-50`}
            disabled={loading}
            onClick={onConfirm}
            type="button"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
