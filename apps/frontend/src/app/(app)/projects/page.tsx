"use client";

import { Check, FolderKanban, ListTodo, Plus, Star, Users, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { AvatarStack } from "@/components/ui/Avatar";
import { ColorPicker } from "@/components/ui/ColorPicker";
import { useAuth } from "@/context/AuthProvider";
import { useModalScrollLock } from "@/hooks/useModalScrollLock";
import { formatCreatedAt } from "@/lib/utils";
import { useAccessibleProjects, useProjectMutations } from "@/features/projects/hooks/useProjects";

export default function ProjectsPage() {
  const { user } = useAuth();
  const accessibleQuery = useAccessibleProjects();
  const projectMutations = useProjectMutations();
  const [createOpen, setCreateOpen] = useState(false);

  const projects = accessibleQuery.data ?? [];
  const owned = projects.filter((project) => project.userId === user?.id);
  const shared = projects.filter((project) => project.userId !== user?.id);

  const renderGrid = (items: typeof projects, emptyLabel: string) =>
    items.length === 0 ? (
      <p className="border border-dashed border-outline-variant p-6 text-center font-body-sm text-body-sm text-on-surface-variant">
        {emptyLabel}
      </p>
    ) : (
      <div className="grid grid-cols-1 gap-section-gap sm:grid-cols-2 xl:grid-cols-3">
        {items.map((project) => {
          const isShared = project.userId !== user?.id;
          const memberUsers = project.members ?? [];
          const people = memberUsers.some((member) => member.user.id === user?.id)
            ? memberUsers
            : [{ user: { id: user?.id ?? "", email: user?.email ?? "", name: user?.name ?? null, avatarUrl: user?.avatarUrl ?? null } }, ...memberUsers];
          const taskCount = project._count?.tasks ?? 0;
          return (
            <Link
              className="group flex flex-col gap-3 border border-outline-variant bg-surface p-section-gap transition-colors hover:border-primary/60 hover:bg-surface-container-low"
              href={`/projects/${project.id}`}
              key={project.id}
            >
              <div className="flex items-center gap-2">
                <span aria-hidden="true" className="h-4 w-4 shrink-0 rounded-full border border-black/10" style={{ backgroundColor: project.color }} />
                <span className="min-w-0 flex-1 truncate font-body-md text-body-md font-medium group-hover:text-primary">
                  {project.name}
                </span>
                {project.isDefault ? (
                  <span className="inline-flex shrink-0 items-center gap-1 border border-primary/25 bg-primary-fixed/50 px-1.5 py-0.5 font-label-caps text-[10px] uppercase tracking-wide text-primary">
                    <Star size={10} /> Predeterminado
                  </span>
                ) : isShared ? (
                  <span className="inline-flex shrink-0 items-center gap-1 border border-secondary-container bg-secondary-container/60 px-1.5 py-0.5 font-label-caps text-[10px] uppercase tracking-wide text-on-secondary-container">
                    <Users size={10} /> Compartido
                  </span>
                ) : (
                  <span className="inline-flex shrink-0 items-center gap-1 border border-outline-variant bg-surface-container-high px-1.5 py-0.5 font-label-caps text-[10px] uppercase tracking-wide text-on-surface-variant">
                    Propio
                  </span>
                )}
              </div>

              <div className="mt-auto flex items-center justify-between gap-2">
                <AvatarStack members={people} max={3} size="sm" />
                <span className="flex shrink-0 items-center gap-3 font-data-mono text-data-mono text-[11px] text-on-surface-variant">
                  <span className="flex items-center gap-1" title="Tareas activas">
                    <ListTodo size={12} /> {taskCount}
                  </span>
                  <span className="hidden sm:inline" title="Creado el">
                    {formatCreatedAt(project.createdAt)}
                  </span>
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    );

  return (
    <section className="flex h-full min-h-0 flex-col p-container-padding sm:p-section-gap">
      <div className="flex min-h-0 flex-1 flex-col border border-outline-variant bg-surface-container-lowest">
        <div className="shrink-0 border-b border-outline-variant bg-surface-container-low px-4 py-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="font-label-caps text-label-caps uppercase text-on-surface-variant">PROYECTOS</p>
              <h1 className="mt-1 font-headline-sm text-headline-sm text-primary">Organiza y comparte</h1>
            </div>
            <button
              className="flex items-center gap-1.5 bg-primary px-3.5 py-2 font-body-sm text-body-sm text-on-primary hover:bg-primary-container hover:text-on-primary-container"
              onClick={() => setCreateOpen(true)}
              type="button"
            >
              <Plus size={15} /> Nuevo proyecto
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 space-y-section-gap overflow-y-auto p-container-padding">
          {accessibleQuery.isLoading ? (
            <p className="py-10 text-center font-body-sm text-body-sm text-on-surface-variant">Cargando proyectos...</p>
          ) : projects.length === 0 ? (
            <div className="flex min-h-[16rem] flex-col items-center justify-center gap-2 border border-outline-variant bg-surface-container-lowest p-section-gap text-center">
              <FolderKanban className="text-primary" size={28} />
              <p className="font-label-caps text-label-caps text-on-surface-variant">SIN PROYECTOS</p>
              <p className="max-w-xl font-body-sm text-body-sm text-on-surface-variant">
                Crea proyectos para agrupar tareas, notas y trabajo en equipo.
              </p>
              <button className="mt-2 bg-primary px-4 py-2 font-body-sm text-body-sm text-on-primary hover:bg-primary-container" onClick={() => setCreateOpen(true)} type="button">
                Crear un proyecto
              </button>
            </div>
          ) : (
            <>
              <div className="space-y-3">
                <h2 className="font-label-caps text-label-caps uppercase text-on-surface-variant">TUS PROYECTOS</h2>
                {renderGrid(owned, "Aún no tienes proyectos propios.")}
              </div>
              {shared.length > 0 && (
                <div className="space-y-3">
                  <h2 className="font-label-caps text-label-caps uppercase text-on-surface-variant">COMPARTIDOS CONTIGO</h2>
                  {renderGrid(shared, "")}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {createOpen && <CreateProjectModal onClose={() => setCreateOpen(false)} onCreate={projectMutations.create.mutateAsync} />}
    </section>
  );
}

function CreateProjectModal({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (payload: { name: string; color?: string }) => Promise<unknown>;
}) {
  const [name, setName] = useState("");
  const [color, setColor] = useState("#303e51");
  const [busy, setBusy] = useState(false);
  useModalScrollLock();

  const submit = async () => {
    const trimmed = name.trim();
    if (!trimmed || busy) return;
    setBusy(true);
    try {
      await onCreate({ name: trimmed, color });
      toast.success("¡Proyecto creado!");
      onClose();
    } catch (error) {
      toast.error((error as { message?: string })?.message ?? "Ups, no pudimos crear el proyecto.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-end bg-on-surface/20 backdrop-blur-[1px] sm:items-center sm:justify-center sm:p-4"
      onClick={onClose}
      role="dialog"
    >
      <div className="flex max-h-[85vh] w-full flex-col border border-outline-variant bg-surface md:max-w-md" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-outline-variant bg-surface-bright px-5 py-4">
          <h2 className="flex items-center gap-2 font-headline-xs text-headline-xs font-bold text-primary">
            <FolderKanban size={16} /> Nuevo proyecto
          </h2>
          <button aria-label="Cerrar" className="text-on-surface-variant hover:text-on-surface" onClick={onClose} type="button">
            <X size={19} />
          </button>
        </div>
        <div className="flex flex-col gap-4 p-5">
          <label className="block">
            <span className="font-label-caps text-label-caps text-on-surface-variant">NOMBRE</span>
            <input
              autoFocus
              className="field mt-1"
              maxLength={100}
              onChange={(event) => setName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") void submit();
              }}
              placeholder="Nombre del proyecto"
              value={name}
            />
          </label>
          <div>
            <span className="font-label-caps text-label-caps text-on-surface-variant">COLOR</span>
            <div className="mt-1">
              <ColorPicker onChange={setColor} value={color} />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              className="flex flex-1 items-center justify-center gap-1.5 bg-primary px-3 py-2 font-body-sm text-body-sm text-on-primary hover:bg-primary-container hover:text-on-primary-container disabled:opacity-50"
              disabled={busy || !name.trim()}
              onClick={() => void submit()}
              type="button"
            >
              <Check size={14} /> Crear
            </button>
            <button
              className="flex-1 border border-outline-variant px-3 py-2 font-body-sm text-body-sm text-on-surface-variant hover:bg-surface-container-high"
              onClick={onClose}
              type="button"
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}