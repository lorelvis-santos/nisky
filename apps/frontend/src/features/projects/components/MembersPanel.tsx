"use client";

import { Mail, ShieldCheck, UserMinus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { useAuth } from "@/context/AuthProvider";
import type { Project, ProjectMember } from "@/types/entities";
import { useProjectMemberMutations, useProjectMembers } from "../hooks/useProjects";

export function MembersPanel({ project }: { project: Project }) {
  const { user } = useAuth();
  const membersQuery = useProjectMembers(project.id);
  const mutations = useProjectMemberMutations(project.id);
  const [email, setEmail] = useState("");
  const [confirmTransferId, setConfirmTransferId] = useState<string | null>(null);
  const isOwner = user?.id === project.userId;
  const members = membersQuery.data ?? [];
  const transferTarget = members.find((member) => member.id === confirmTransferId) ?? null;

  const invite = async () => {
    const trimmed = email.trim();
    if (!trimmed) return;
    try {
      await mutations.invite.mutateAsync(trimmed);
      setEmail("");
      toast.success("¡Invitación enviada!");
    } catch (error) {
      toast.error((error as { message?: string })?.message ?? "Ups, no pudimos enviar la invitación.");
    }
  };

  const remove = async (memberId: string) => {
    try {
      await mutations.remove.mutateAsync(memberId);
      toast.success("Miembro eliminado");
    } catch {
      toast.error("Ups, no pudimos eliminar al miembro.");
    }
  };

  const makeOwner = async (memberId: string) => {
    try {
      await mutations.updateRole.mutateAsync({ memberId, role: "OWNER" });
      setConfirmTransferId(null);
      toast.success("¡Se transfirió la propiedad del proyecto!");
    } catch {
      toast.error("Ups, no pudimos cambiar el rol.");
    }
  };

  return (
    <div className="space-y-2">
      <p className="font-label-caps text-label-caps text-on-surface-variant">MIEMBROS</p>
      {membersQuery.isLoading ? (
        <p className="font-body-sm text-body-sm text-on-surface-variant">Cargando miembros...</p>
      ) : (
        <div className="divide-y divide-outline-variant">
          {members.map((member) => {
            const isSelf = member.userId === user?.id;
            return (
              <div className="flex items-center gap-2 py-2" key={member.id}>
                {member.user.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img alt={member.user.name ?? member.user.email} className="h-6 w-6 shrink-0 rounded-full border border-outline-variant object-cover" src={member.user.avatarUrl} />
                ) : (
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-outline-variant bg-surface-container-high font-data-mono text-data-mono text-xs text-primary">
                    {(member.user.name ?? member.user.email).charAt(0).toUpperCase()}
                  </span>
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-body-sm text-body-sm text-on-surface">{member.user.name ?? member.user.email}</span>
                  <span className="block truncate font-data-mono text-data-mono text-[11px] text-on-surface-variant">
                    {member.user.email}{isSelf ? " · tú" : ""}
                  </span>
                </span>
                <span className="flex shrink-0 items-center gap-1">
                  <span className={`font-data-mono text-data-mono text-[11px] ${member.role === "OWNER" ? "text-primary" : "text-on-surface-variant"}`}>
                    {member.role === "OWNER" ? "Dueño" : "Miembro"}
                  </span>
                  {isOwner && !isSelf && member.role === "MEMBER" && (
                    <button
                      aria-label={`Hacer dueño a ${member.user.name ?? member.user.email}`}
                      className="p-1 text-on-surface-variant hover:text-primary"
                      onClick={() => setConfirmTransferId(member.id)}
                      title="Transferir propiedad"
                      type="button"
                    >
                      <ShieldCheck size={14} />
                    </button>
                  )}
                  {isOwner && !isSelf && (
                    <button
                      aria-label={`Eliminar a ${member.user.name ?? member.user.email}`}
                      className="p-1 text-on-surface-variant hover:text-error"
                      onClick={() => void remove(member.id)}
                      title="Eliminar miembro"
                      type="button"
                    >
                      <UserMinus size={14} />
                    </button>
                  )}
                </span>
              </div>
            );
          })}
        </div>
      )}
      {isOwner && (
        <div className="flex gap-2 pt-1">
          <input
            aria-label="Email del nuevo miembro"
            className="field h-8 min-w-0 flex-1"
            onChange={(event) => setEmail(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") void invite();
            }}
            placeholder="email@ejemplo.com"
            type="email"
            value={email}
          />
          <button
            className="flex items-center gap-1 border border-outline-variant px-2.5 py-1.5 font-body-sm text-body-sm text-primary hover:bg-surface-container-high disabled:opacity-50"
            disabled={!email.trim()}
            onClick={() => void invite()}
            type="button"
          >
            <Mail size={13} /> Invitar
          </button>
        </div>
      )}

      {confirmTransferId && transferTarget && (
        <ConfirmModal
          confirmLabel="Transferir"
          loading={mutations.updateRole.isPending}
          message={
            <>
              ¿Transferir la propiedad de <strong>{project.name}</strong> a <strong>{transferTarget.user.name ?? transferTarget.user.email}</strong>? Perderás el control del proyecto: quedarás como miembro y el nuevo dueño podrá expulsarte o eliminar el proyecto.
            </>
          }
          onClose={() => setConfirmTransferId(null)}
          onConfirm={() => void makeOwner(transferTarget.id)}
          title="¿Transferir propiedad?"
        />
      )}
    </div>
  );
}