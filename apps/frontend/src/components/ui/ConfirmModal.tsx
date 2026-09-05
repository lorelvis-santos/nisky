"use client";

import type { ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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
  return (
    <Dialog open onOpenChange={(nextOpen) => { if (!nextOpen) onClose(); }}>
      <DialogContent className="max-w-md rounded-2xl border-outline-variant bg-surface p-0" showCloseButton={false}>
        <DialogHeader className="border-b border-outline-variant bg-surface-bright px-5 py-4 text-left">
          <DialogTitle className="font-headline-xs text-headline-xs normal-case tracking-normal">{title}</DialogTitle>
          <DialogDescription className="mt-3 font-body-md text-body-md text-on-surface-variant">{message}</DialogDescription>
        </DialogHeader>
        <DialogFooter className="mt-0 flex-row justify-end border-t-0 bg-surface-container-low px-5 py-4">
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
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
