"use client";

import { ArrowUpRight, CalendarDays, FolderKanban, ListTodo, MessageSquare, Pencil, Plus, Star, Trash2, Users, X } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Avatar, AvatarStack } from "@/components/ui/Avatar";
import { ColorPicker } from "@/components/ui/ColorPicker";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { useAuth } from "@/context/AuthProvider";
import { useModalScrollLock } from "@/hooks/useModalScrollLock";
import { CommentThread } from "@/features/comments/CommentThread";
import { useProjectComments } from "@/features/comments/hooks/useComments";
import { PriorityChip } from "@/features/tasks/components/PriorityChip";
import { MembersPanel } from "@/features/projects/components/MembersPanel";
import { useProjectMembers, useProjectMutations, useProjectQuery } from "@/features/projects/hooks/useProjects";
import { useTasksQuery } from "@/features/tasks/hooks/useTasks";
import { formatRelativeDate, isTaskOverdue } from "@/lib/utils";

type Tab = "general" | "members" | "comments";

function timeAgo(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value);
  const diffMs = Date.now() - date.getTime();
  const sec = Math.floor(diffMs / 1000);
  if (sec < 60) return "hace un momento";
  const min = Math.floor(sec / 60);
  if (min < 60) return `hace ${min} min`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `hace ${hr} h`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `hace ${day} d`;
  const wk = Math.floor(day / 7);
  if (wk < 4) return `hace ${wk} sem`;
  const month = Math.floor(day / 30);
  if (month < 12) return `hace ${month} mes${month > 1 ? "es" : ""}`;
  const yr = Math.floor(day / 365);
  return `hace ${yr} año${yr > 1 ? "s" : ""}`;
}

export default function ProjectDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const projectId = params.id;
  const { user } = useAuth();
  const projectQuery = useProjectQuery(projectId);
  const membersQuery = useProjectMembers(projectId);
  const commentsQuery = useProjectComments(projectId, { order: "desc", limit: 1 });
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
  const lastComment = commentsQuery.data?.data[0];
  const activeTab = project.isDefault && tab === "members" ? "general" : tab;

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
              <span aria-hidden="true" className="h-9 w-9 shrink-0 rounded-full border border-black/10" style={{ backgroundColor: project.color }} />
              <div className="min-w-0">
                <h1 className="truncate font-headline-sm text-headline-sm">{project.name}</h1>
                <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 font-data-mono text-data-mono text-xs text-on-surface-variant">
                  {project.isDefault ? (
                    <>
                      <Star size={11} className="text-primary" /> Proyecto personal
                    </>
                  ) : isOwner ? (
                    "Eres el dueño"
                  ) : (
                    "Eres miembro"
                  )}
                  {!project.isDefault && members.length > 0 && (
                    <>
                      <span aria-hidden="true">·</span>
                      <AvatarStack members={members} max={4} size="xs" />
                      <span>{members.length} {members.length === 1 ? "miembro" : "miembros"}</span>
                    </>
                  )}
                </p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {isOwner && (
                <>
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
                </>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="shrink-0 border-b border-outline-variant bg-surface-container-low px-2 pt-2">
          <div className="no-scrollbar flex gap-1 overflow-x-auto">
            {(
              [
                { id: "general", label: "Vista general", Icon: FolderKanban },
                ...(project.isDefault ? [] : [{ id: "members" as const, label: "Miembros", Icon: Users }]),
                { id: "comments", label: "Conversación", Icon: MessageSquare },
              ] as const
            ).map(({ id, label, Icon }) => (
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
          {activeTab === "general" && (
            <div className="mx-auto max-w-3xl space-y-section-gap">
              <div className={`grid grid-cols-1 gap-section-gap ${project.isDefault ? "sm:grid-cols-2" : "sm:grid-cols-3"}`}>
                <button
                    className="group flex cursor-pointer flex-col gap-2 border border-outline-variant bg-surface-container-low p-4 text-left transition-colors hover:border-primary/60 hover:bg-surface-container-high"
                    onClick={() => router.push(`/tasks?projectId=${encodeURIComponent(project.id)}`)}
                    title="Ver planificación y tareas de este proyecto"
                    type="button"
                  >
                    <span className="flex items-center justify-between gap-2">
                      <p className="font-label-caps text-label-caps text-on-surface-variant">TAREAS ACTIVAS</p>
                      <span className="flex shrink-0 items-center gap-1">
                        <ListTodo size={14} className="text-primary" />
                        <ArrowUpRight size={14} className="text-primary opacity-0 transition-opacity group-hover:opacity-100" />
                      </span>
                    </span>
                    <p className="font-headline-md text-headline-md font-bold text-primary">{activeTasks.length}</p>
                    <span className="font-label-caps text-[11px] uppercase tracking-wide text-on-surface-variant opacity-0 transition-opacity group-hover:opacity-100">
                      Ver planificación →
                    </span>
                    {projectTasks.length > 0 && (
                      <div className="mt-auto flex flex-col gap-1">
                        <div className="h-1.5 w-full overflow-hidden rounded-[2px] border border-outline-variant bg-surface-container-high">
                          <div className="h-full bg-primary" style={{ width: `${Math.round((projectTasks.filter((task) => task.status === "COMPLETED").length / projectTasks.length) * 100)}%` }} />
                        </div>
                        <span className="font-data-mono text-data-mono text-[11px] text-on-surface-variant">
                          {projectTasks.filter((task) => task.status === "COMPLETED").length}/{projectTasks.length} completadas
                        </span>
                      </div>
                    )}
                  </button>
                {!project.isDefault && (
                  <button className="flex cursor-pointer flex-col gap-2 border border-outline-variant bg-surface-container-low p-4 text-left transition-colors hover:border-primary/60 hover:bg-surface-container-high" onClick={() => setTab("members")} type="button">
                    <span className="flex items-center justify-between gap-2">
                      <p className="font-label-caps text-label-caps text-on-surface-variant">MIEMBROS</p>
                      <Users size={14} className="text-primary" />
                    </span>
                    <p className="font-headline-md text-headline-md font-bold text-primary">{members.length}</p>
                    {members.length > 0 && <AvatarStack members={members} max={5} size="sm" />}
                  </button>
                )}
                <button className="flex cursor-pointer flex-col gap-2 border border-outline-variant bg-surface-container-low p-4 text-left transition-colors hover:border-primary/60 hover:bg-surface-container-high" onClick={() => setTab("comments")} type="button">
                  <span className="flex items-center justify-between gap-2">
                    <p className="font-label-caps text-label-caps text-on-surface-variant">CONVERSACIÓN</p>
                    <MessageSquare size={14} className="text-primary" />
                  </span>
                  {lastComment ? (
                    <div className="flex flex-col gap-0.5">
                      <p className="font-headline-sm text-headline-sm font-bold text-primary truncate">
                        {lastComment.author.name ?? lastComment.author.email}
                      </p>
                      <p className="font-body-sm text-body-sm text-on-surface-variant">{timeAgo(lastComment.createdAt)}</p>
                    </div>
                  ) : (
                    <p className="font-headline-md text-headline-md font-bold text-primary">—</p>
                  )}
                  {commentsCount > 0 && (
                    <span className="mt-auto font-body-sm text-body-sm text-on-surface-variant">
                      {commentsCount} mensaje{commentsCount > 1 ? "s" : ""}
                    </span>
                  )}
                </button>
              </div>

              <div className="border border-outline-variant bg-surface p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-label-caps text-label-caps text-on-surface-variant">PRÓXIMAS TAREAS</p>
                  {projectTasks.length > 0 && (
                    <button className="font-label-caps text-[11px] uppercase tracking-wide text-primary hover:underline" onClick={() => router.push(`/tasks?projectId=${encodeURIComponent(project.id)}`)} type="button">
                      Ver todas
                    </button>
                  )}
                </div>
                {projectTasks.length === 0 ? (
                  <div className="mt-4 flex flex-col items-center gap-3 text-center">
                    <p className="font-body-sm text-body-sm text-on-surface-variant">
                      No hay tareas en este proyecto todavía.
                    </p>
                    <button
                      className="inline-flex items-center gap-2 border border-primary bg-transparent px-4 py-2 font-body-sm text-body-sm text-primary hover:bg-primary-fixed/50 hover:border-primary/60"
                      onClick={() => router.push(`/tasks?modal=create&projectId=${encodeURIComponent(project.id)}`)}
                      type="button"
                    >
                      <Plus size={15} /> Crear primera tarea
                    </button>
                  </div>
                ) : (
                  <ul className="mt-2 divide-y divide-outline-variant">
                    {projectTasks.slice(0, 6).map((task) => {
                      const overdue = isTaskOverdue(task);
                      return (
                        <li key={task.id}>
                          <button
                            className="flex w-full items-center gap-2.5 py-2.5 text-left font-body-sm text-body-sm hover:bg-surface-container-low"
                            onClick={() => router.push(`/tasks?taskId=${encodeURIComponent(task.id)}`)}
                            type="button"
                          >
                            <span
                              aria-hidden="true"
                              className={`h-2 w-2 shrink-0 rounded-full ${task.status === "COMPLETED" ? "bg-primary" : task.status === "IN_PROGRESS" ? "bg-tertiary" : task.status === "CANCELLED" ? "bg-outline" : "bg-on-surface-variant"}`}
                            />
                            <span className={`min-w-0 flex-1 truncate ${task.status === "COMPLETED" ? "text-on-surface-variant line-through" : "text-on-surface"}`}>
                              {task.title}
                            </span>
                            <PriorityChip priority={task.priority} />
                            {(task.commentCount ?? 0) > 0 && (
                              <span className="flex shrink-0 items-center gap-1 font-data-mono text-data-mono text-[11px] text-on-surface-variant" title="Comentarios">
                                <MessageSquare size={11} /> {task.commentCount}
                              </span>
                            )}
                            {task.dueDate && (
                              <span className={`flex shrink-0 items-center gap-1 font-data-mono text-data-mono text-[11px] ${overdue ? "text-error" : "text-on-surface-variant"}`}>
                                <CalendarDays size={11} />
                                {formatRelativeDate(task.dueDate, true)}
                              </span>
                            )}
                            {task.assignee && (
                              <Avatar
                                avatarUrl={task.assignee.avatarUrl}
                                className="ring-2 ring-surface"
                                email={task.assignee.email}
                                name={task.assignee.name}
                                size="xs"
                              />
                            )}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>
          )}

          {activeTab === "members" && (
            <div className="mx-auto max-w-2xl">
              <MembersPanel project={project} />
            </div>
          )}

          {activeTab === "comments" && (
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