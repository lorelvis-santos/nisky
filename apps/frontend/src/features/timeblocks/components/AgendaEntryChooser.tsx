"use client";

import { CalendarClock, CalendarDays } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export type AgendaEntryKind = "block" | "event";

export function AgendaEntryChooser({
  onClose,
  onSelect,
}: {
  onClose: () => void;
  onSelect: (kind: AgendaEntryKind) => void;
}) {
  return (
    <Dialog
      open
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onClose();
      }}
    >
      <DialogContent
        className="max-w-md rounded-2xl border-outline-variant bg-surface p-0 shadow-cadence-3"
        showCloseButton={false}
      >
        <DialogHeader className="rounded-t-2xl bg-surface-bright px-6 pt-5 text-left">
          <DialogTitle className="font-headline-xs text-headline-xs font-bold normal-case tracking-normal text-primary">
            Añadir a Agenda
          </DialogTitle>
          <DialogDescription className="font-body-sm text-body-sm text-on-surface-variant">
            ¿Qué quieres reservar?
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 px-6 pb-6 sm:grid-cols-2">
          <button
            className="group flex min-h-32 flex-col gap-4 rounded-2xl border border-outline-variant/70 bg-surface p-5 text-left shadow-sm transition-colors hover:border-primary/60 hover:bg-surface-container-low focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            onClick={() => onSelect("block")}
            type="button"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-fixed text-primary transition-colors group-hover:bg-primary group-hover:text-on-primary">
              <CalendarClock size={20} />
            </span>
            <span>
              <span className="block font-headline-xs text-headline-xs font-semibold text-on-surface">
                Tiempo para trabajar
              </span>
              <span className="mt-1 block font-body-sm text-body-sm text-on-surface-variant">
                Reserva una sesión de enfoque
              </span>
            </span>
          </button>
          <button
            className="group flex min-h-32 flex-col gap-4 rounded-2xl border border-outline-variant/70 bg-surface p-5 text-left shadow-sm transition-colors hover:border-secondary/60 hover:bg-surface-container-low focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary"
            onClick={() => onSelect("event")}
            type="button"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary-container text-secondary transition-colors group-hover:bg-secondary group-hover:text-on-secondary">
              <CalendarDays size={20} />
            </span>
            <span>
              <span className="block font-headline-xs text-headline-xs font-semibold text-on-surface">
                Evento
              </span>
              <span className="mt-1 block font-body-sm text-body-sm text-on-surface-variant">
                Registra un compromiso con hora
              </span>
            </span>
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
