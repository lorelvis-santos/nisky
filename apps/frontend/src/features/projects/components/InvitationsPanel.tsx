"use client";

import { Check, UserPlus, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useInvitationMutations, usePendingInvitations } from "../hooks/useProjects";

export function InvitationsPanel() {
  const [open, setOpen] = useState(false);
  const invitationsQuery = usePendingInvitations();
  const mutations = useInvitationMutations();
  const invitations = invitationsQuery.data ?? [];
  const pending = invitations.length;

  const accept = async (id: string) => {
    try {
      await mutations.accept.mutateAsync(id);
      toast.success("¡Invitación aceptada!");
    } catch {
      toast.error("Ups, no pudimos aceptar la invitación. Inténtalo de nuevo.");
    }
  };

  const decline = async (id: string) => {
    try {
      await mutations.decline.mutateAsync(id);
      toast.success("Invitación rechazada");
    } catch {
      toast.error("Ups, no pudimos rechazar la invitación. Inténtalo de nuevo.");
    }
  };

  return (
    <div className="relative">
      <button
        aria-expanded={open}
        aria-label={`Invitaciones a proyectos${pending > 0 ? ` (${pending})` : ""}`}
        className="relative p-2 text-on-surface-variant hover:bg-surface-container-low hover:text-primary"
        onClick={() => setOpen((value) => !value)}
        type="button"
      >
        <UserPlus size={19} />
        {pending > 0 && (
          <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 font-data-mono text-[10px] text-on-primary">
            {pending > 9 ? "9+" : pending}
          </span>
        )}
      </button>
      {open && (
        <div className="fixed inset-x-4 top-14 z-50 border border-outline-variant bg-surface-container-lowest p-3 text-left sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2 sm:w-[22rem]">
          <div className="flex items-center justify-between border-b border-outline-variant pb-3">
            <div>
              <p className="font-label-caps text-label-caps uppercase text-on-surface-variant">INVITACIONES</p>
              <h3 className="mt-1 font-headline-xs text-headline-xs">Proyectos compartidos</h3>
            </div>
            <button aria-label="Cerrar invitaciones" className="text-on-surface-variant hover:text-on-surface" onClick={() => setOpen(false)} type="button"><X size={16} /></button>
          </div>
          {pending === 0 ? (
            <p className="px-1 py-5 font-body-sm text-body-sm text-on-surface-variant">No tienes invitaciones pendientes.</p>
          ) : (
            <div className="max-h-80 overflow-y-auto divide-y divide-outline-variant pr-1 [scrollbar-gutter:stable]">
              {invitations.map((invitation) => (
                <div className="flex items-start gap-3 py-3" key={invitation.id}>
                  <span aria-hidden="true" className="mt-0.5 h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: invitation.project.color }} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-body-sm text-body-sm text-on-surface">{invitation.project.name}</span>
                    <span className="mt-0.5 block truncate font-data-mono text-data-mono text-xs text-on-surface-variant">
                      {invitation.invitedBy.name ?? invitation.invitedBy.email}
                      {invitation.invitedBy.username ? ` (@${invitation.invitedBy.username})` : ""} · {invitation.email}
                    </span>
                  </span>
                  <span className="flex shrink-0 items-center gap-1">
                    <button
                      aria-label={`Aceptar invitación a ${invitation.project.name}`}
                      className="flex items-center gap-1 border border-outline-variant px-2 py-1 font-body-sm text-body-sm text-primary hover:bg-surface-container-high"
                      onClick={() => void accept(invitation.id)}
                      type="button"
                    >
                      <Check size={13} /> Aceptar
                    </button>
                    <button
                      aria-label={`Rechazar invitación a ${invitation.project.name}`}
                      className="p-1.5 text-on-surface-variant hover:text-error"
                      onClick={() => void decline(invitation.id)}
                      type="button"
                    >
                      <X size={14} />
                    </button>
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
