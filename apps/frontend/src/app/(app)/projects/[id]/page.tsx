"use client";

import { FolderKanban, MessageSquare, Pencil, Star, Trash2, Users, X } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { ColorPicker } from "@/components/ui/ColorPicker";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { useAuth } from "@/context/AuthProvider";
import { useModalScrollLock } from "@/hooks/useModalScrollLock";
import { CommentThread } from "@/features/comments/CommentThread";
import { useProjectComments } from "@/features/comments/hooks/useComments";
import { MembersPanel } from "@/features/projects/components/MembersPanel";
import { useProjectMembers, useProjectMutations, useProjectQuery } from "@/features/projects/hooks/useProjects";
import { useTasksQuery } from "@/features/tasks/hooks/useTasks";

type Tab = "general" | "members" | "comments";

export default function ProjectDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const projectId = params.id;
  const { user } = useAuth();
  const projectQuery = useProjectQuery(projectId);
  const membersQuery = useProjectMembers(projectId);
  const commentsQuery = useProjectComments(projectId);
  const tasksQuery = useTasksQuery({ limit: 100 });
  const projectMutations = useProjectMutations();
  const [tab, setTab] = useState<Tab>("general");
  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState("#303e51");
  const [confirmDelete, setConfirmDelete] = useState(false);

  const project = projectQuery.data;
  if (!project) {
    return (
      <div className="flex h-full items-center justify-center font-body-sm text-body-sm text-on-surface-variant">
        {projectQuery.isLoading ? "Cargando proyecto..." : "El proyecto no existe o no tienes acceso."}
      </div>
    );
  }

  const isOwner = project.userId === user?.id;
  const projectTasks = tasksQuery.data?.data.filter((task) => task.projectId === project.id) ?? [];
  const activeTasks = projectTasks.filter((task) => task.status === "PENDING" || task.status === "IN_PROGRESS");
  const members = membersQuery.data ?? [];
  const commentsCount = commentsQuery.data?.meta.totalItems ?? 0;

  const saveEdit = async () => {
    try {
      await projectMutations.update.mutateAsync({
        id: project.id,
        payload: { name: editName.trim(), color: editColor },
      });
      toast.success("Proyecto actualizado");
      setEditOpen(false);
    } catch {
      toast.error("Ups, no pudimos guardar los cambios.");
    }
  };

  const removeProject = async () => {
    try {
      await projectMutations.remove.mutateAsync(project.id);
      toast.success("Proyecto eliminado");
      router.replace("/projects");
    } catch {
      toast.error("Ups, no pudimos eliminar el proyecto.");
      setConfirmDelete(false);
    }
  };

  return (
    <section className="flex h-full min-h-0 flex-col p-container-padding sm:p-section-gap">
      <div className="flex min-h-0 flex-1 flex-col border border-outline-variant bg-surface-container-lowest">
        {/* Header del proyecto */}
        <div className="shrink-0 border-b border-outline-variant bg-surface-container-low px-4 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <span aria-hidden="true" className="h-9 w-9 shrink-0 rounded-lg border border-outline-variant" style={{ backgroundColor: project.color }} />
              <div className="min-w-0">
                <h1 className="truncate font-headline-sm text-headline-sm">{project.name}</h1>
                <p className="flex items-center gap-1.5 font-data-mono text-data-mono text-xs text-on-surface-variant">
                  {project.isDefault ? (
                    <>
                      <Star size={11} className="text-primary" /> Proyecto personal
                    </>
                  ) : isOwner ? (
                    "Eres el dueño"
                  ) : (
                    "Eres miembro"
                  )}
                </p>
              </div>
            </div>
            {isOwner && (
              <div className="flex shrink-0 items-center gap-2">
                <button
                  className="flex items-center gap-1.5 border border-outline-variant px-3 py-1.5 font-body-sm text-body-sm text-on-surface-variant hover:bg-surface-container-high hover:text-primary"
                  onClick={() => {
                    setEditName(project.name);
                    setEditColor(project.color);
                    setEditOpen(true);
                  }}
                  type="button"
                >
                  <Pencil size={14} /> Editar
                </button>
                <button
                  className="flex items-center gap-1.5 border border-outline-variant px-3 py-1.5 font-body-sm text-body-sm text-error hover:bg-error hover:text-error-foreground"
                  onClick={() => setConfirmDelete(true)}
                  type="button"
                >
                  <Trash2 size={14} /> Eliminar
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="shrink-0 border-b border-outline-variant bg-surface-container-low px-2 pt-2">
          <div className="flex gap-1 overflow-x-auto">
            {(
              [
                ["general", "Vista general", FolderKanban],
                ["members", "Miembros", Users],
                ["comments", "Comentarios", MessageSquare],
              ] as const
            ).map(([id, label, Icon]) => (
              <button
                className={`flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2 font-label-caps text-label-caps uppercase ${tab === id ? "border-primary text-primary" : "border-transparent text-on-surface-variant hover:text-on-surface"}`}
                key={id}
                onClick={() => setTab(id)}
                type="button"
              >
                <Icon size={14} />
                {label}
                {id === "members" && members.length > 0 && (
                  <span className="font-data-mono text-data-mono text-xs">{members.length}</span>
                )}
                {id === "comments" && commentsCount > 0 && (
                  <span className="font-data-mono text-data-mono text-xs">{commentsCount}</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Contenido */}
        <div className="min-h-0 flex-1 overflow-y-auto p-container-padding">
          {tab === "general" && (
            <div className="mx-auto max-w-3xl space-y-section-gap">
              <div className="grid grid-cols-1 gap-section-gap sm:grid-cols-3">
                <div className="border border-outline-variant bg-surface-container-low p-4">
                  <p className="font-label-caps text-label-caps text-on-surface-variant">TAREAS ACTIVAS</p>
                  <p className="mt-1 font-headline-md text-headline-md font-bold text-primary">{activeTasks.length}</p>
                </div>
                <button className="border border-outline-variant bg-surface-container-low p-4 text-left hover:bg-surface-container-high" onClick={() => setTab("members")} type="button">
                  <p className="font-label-caps text-label-caps text-on-surface-variant">MIEMBROS</p>
                  <p className="mt-1 font-headline-md text-headline-md font-bold text-primary">{members.length}</p>
                </button>
                <button className="border border-outline-variant bg-surface-container-low p-4 text-left hover:bg-surface-container-high" onClick={() => setTab("comments")} type="button">
                  <p className="font-label-caps text-label-caps text-on-surface-variant">COMENTARIOS</p>
                  <p className="mt-1 font-headline-md text-headline-md font-bold text-primary">{commentsCount}</p>
                </button>
              </div>

              <div className="border border-outline-variant bg-surface p-4">
                <p className="font-label-caps text-label-caps text-on-surface-variant">PRÓXIMAS TAREAS</p>
                {projectTasks.length === 0 ? (
                  <p className="mt-2 font-body-sm text-body-sm text-on-surface-variant">
                    No hay tareas en este proyecto todavía. Crea una desde Planificación y tareas.
                  </p>
                ) : (
                  <ul className="mt-2 divide-y divide-outline-variant">
                    {projectTasks.slice(0, 6).map((task) => (
                      <li key={task.id}>
                        <button
                          className="flex w-full items-center gap-2 py-2 text-left font-body-sm text-body-sm hover:text-primary"
                          onClick={() => router.push(`/tasks?taskId=${encodeURIComponent(task.id)}`)}
                          type="button"
                        >
                          <span className={`h-2 w-2 shrink-0 rounded-full ${task.status === "COMPLETED" ? "bg-primary" : "bg-on-surface-variant"}`} />
                          <span className={`min-w-0 flex-1 truncate ${task.status === "COMPLETED" ? "text-on-surface-variant line-through" : ""}`}>
                            {task.title}
                          </span>
                          {task.assignee && (
                            <span className="shrink-0 font-data-mono text-data-mono text-xs text-on-surface-variant">
                              {task.assignee.name ?? task.assignee.email}
                            </span>
                          )}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}

          {tab === "members" && (
            <div className="mx-auto max-w-2xl">
              <MembersPanel project={project} />
            </div>
          )}

          {tab === "comments" && (
            <div className="mx-auto flex h-full max-w-2xl flex-col">
              <CommentThread kind="project" id={project.id} />
            </div>
          )}
        </div>
      </div>

      {editOpen && (
        <EditProjectModal
          color={editColor}
          name={editName}
          onClose={() => setEditOpen(false)}
          onColorChange={setEditColor}
          onNameChange={setEditName}
          onSave={() => void saveEdit()}
        />
      )}

      {confirmDelete && (
        <ConfirmModal
          cancelLabel="Cancelar"
          confirmLabel="Eliminar"
          danger
          loading={projectMutations.remove.isPending}
          message={
            <>
              ¿Seguro que quieres eliminar <strong>{project.name}</strong>? Esta acción no se puede deshacer: se eliminarán el proyecto, sus tareas y comentarios, y los miembros perderán el acceso.
            </>
          }
          onClose={() => setConfirmDelete(false)}
          onConfirm={() => void removeProject()}
          title="¿Eliminar proyecto?"
        />
      )}
    </section>
  );
}

function EditProjectModal({
  name,
  color,
  onNameChange,
  onColorChange,
  onSave,
  onClose,
}: {
  name: string;
  color: string;
  onNameChange: (value: string) => void;
  onColorChange: (value: string) => void;
  onSave: () => void;
  onClose: () => void;
}) {
  useModalScrollLock();
  return (
    <div aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center bg-on-surface/20 p-4 backdrop-blur-[1px]" onClick={onClose} role="dialog">
      <div className="w-full max-w-md border border-outline-variant bg-surface" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-outline-variant bg-surface-bright px-5 py-4">
          <h2 className="font-headline-xs text-headline-xs font-bold text-primary">Editar proyecto</h2>
          <button aria-label="Cerrar" className="text-on-surface-variant hover:text-on-surface" onClick={onClose} type="button">
            <X size={19} />
          </button>
        </div>
        <div className="space-y-4 p-5">
          <label className="block">
            <span className="font-label-caps text-label-caps text-on-surface-variant">NOMBRE</span>
            <input autoFocus className="field mt-1" maxLength={100} onChange={(event) => onNameChange(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") onSave(); }} value={name} />
          </label>
          <div>
            <span className="font-label-caps text-label-caps text-on-surface-variant">COLOR</span>
            <div className="mt-1">
              <ColorPicker onChange={onColorChange} value={color} />
            </div>
          </div>
          <div className="flex gap-2">
            <button className="flex-1 bg-primary px-3 py-2 font-body-sm text-body-sm text-on-primary hover:bg-primary-container hover:text-on-primary-container disabled:opacity-50" disabled={!name.trim()} onClick={onSave} type="button">
              Guardar
            </button>
            <button className="flex-1 border border-outline-variant px-3 py-2 font-body-sm text-body-sm text-on-surface-variant hover:bg-surface-container-high" onClick={onClose} type="button">
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}