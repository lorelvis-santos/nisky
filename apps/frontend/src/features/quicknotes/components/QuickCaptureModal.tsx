"use client";

import { AlarmClock, FileText, StickyNote, X } from "lucide-react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { useIsMobile } from "@/hooks/useIsMobile";
import { CaptureComposer, type CaptureMode } from "./CaptureComposer";

const modeLabels: Record<CaptureMode, string> = {
  TASK: "Nueva captura",
  NOTE: "Nueva nota",
  REMINDER: "Nuevo recordatorio",
};

function ModeIcon({ mode }: { mode: CaptureMode }) {
  if (mode === "NOTE") return <StickyNote aria-hidden="true" size={18} />;
  if (mode === "REMINDER") return <AlarmClock aria-hidden="true" size={18} />;
  return <FileText aria-hidden="true" size={18} />;
}

function CaptureHeading({ mode, kind }: { mode: CaptureMode; kind: "dialog" | "drawer" }) {
  const title = modeLabels[mode];
  const description = "Captura una idea, tarea o recordatorio sin perder el contexto.";
  if (kind === "drawer") {
    return (
      <DrawerHeader className="flex shrink-0 flex-row items-center justify-between border-b border-outline-variant bg-surface-bright px-5 py-4 text-left">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary-container text-secondary"><ModeIcon mode={mode} /></span>
          <div className="min-w-0">
            <DrawerTitle className="font-headline-sm text-headline-sm font-semibold normal-case tracking-normal text-on-surface">{title}</DrawerTitle>
            <DrawerDescription className="mt-0.5 font-body-sm text-body-sm text-on-surface-variant">{description}</DrawerDescription>
          </div>
        </div>
        <DrawerClose asChild>
          <button aria-label="Cerrar captura" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface" type="button"><X size={19} /></button>
        </DrawerClose>
      </DrawerHeader>
    );
  }
  return (
    <DialogHeader className="flex shrink-0 flex-row items-center justify-between border-b border-outline-variant bg-surface-bright px-5 py-4 text-left">
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary-container text-secondary"><ModeIcon mode={mode} /></span>
        <div className="min-w-0">
          <DialogTitle className="font-headline-sm text-headline-sm font-semibold text-on-surface">{title}</DialogTitle>
          <DialogDescription className="mt-0.5 font-body-sm text-body-sm text-on-surface-variant">{description}</DialogDescription>
        </div>
      </div>
      <DialogClose asChild>
        <button aria-label="Cerrar captura" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface" type="button"><X size={19} /></button>
      </DialogClose>
    </DialogHeader>
  );
}

export function QuickCaptureModal({ open, onClose, initialMode = "TASK" }: { open: boolean; onClose: () => void; initialMode?: CaptureMode }) {
  const isSmallScreen = useIsMobile(639);

  if (isSmallScreen) {
    return (
      <Drawer open={open} onOpenChange={(nextOpen) => { if (!nextOpen) onClose(); }}>
        <DrawerContent className="max-h-[92dvh] rounded-t-3xl border-outline-variant bg-surface-bright">
          <CaptureHeading kind="drawer" mode={initialMode} />
          <CaptureComposer initialMode={initialMode} key={`${open ? "open" : "closed"}-${initialMode}`} onClose={onClose} />
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => { if (!nextOpen) onClose(); }}>
      <DialogContent className="flex max-h-[88dvh] w-full max-w-xl flex-col gap-0 overflow-hidden rounded-2xl border-outline-variant bg-surface-bright p-0" showCloseButton={false}>
        <CaptureHeading kind="dialog" mode={initialMode} />
        <CaptureComposer initialMode={initialMode} key={`${open ? "open" : "closed"}-${initialMode}`} onClose={onClose} />
      </DialogContent>
    </Dialog>
  );
}
