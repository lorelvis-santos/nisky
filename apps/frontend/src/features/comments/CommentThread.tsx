"use client";

import { Pencil, Send, Trash2, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthProvider";
import { MarkdownPreview } from "@/components/ui/MarkdownPreview";
import type { Comment } from "@/types/entities";
import { useCommentMutations, useProjectComments, useTaskComments } from "./hooks/useComments";

function timeAgo(value: string) {
  const diff = Date.now() - new Date(value).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "ahora";
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "ayer";
  return `hace ${days} d`;
}

export function CommentThread({ kind, id }: { kind: "project" | "task"; id: string }) {
  const { user } = useAuth();
  const { data, isLoading } = kind === "project" ? useProjectComments(id) : useTaskComments(id);
  const { create, update, remove } = useCommentMutations();
  const [newBody, setNewBody] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editBody, setEditBody] = useState("");
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  const comments = data?.data ?? [];

  const handleCreate = async () => {
    const body = newBody.trim();
    if (!body) return;
    try {
      await create.mutateAsync({ kind, id, body });
      setNewBody("");
    } catch {
      toast.error("Ups, no pudimos publicar el comentario.");
    }
  };

  const handleUpdate = async (commentId: string) => {
    const body = editBody.trim();
    if (!body) return;
    try {
      await update.mutateAsync({ id: commentId, body });
      setEditingId(null);
    } catch {
      toast.error("Ups, no pudimos guardar el comentario.");
    }
  };

  const handleDelete = async (commentId: string) => {
    try {
      await remove.mutateAsync(commentId);
      setConfirmingId(null);
      toast.success("Comentario eliminado");
    } catch {
      toast.error("Ups, no pudimos borrar el comentario.");
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-1" data-modal-scroll>
        {isLoading ? (
          <p className="py-6 text-center font-body-sm text-body-sm text-on-surface-variant">Cargando comentarios...</p>
        ) : comments.length === 0 ? (
          <p className="py-6 text-center font-body-sm text-body-sm text-on-surface-variant">
            Aún no hay comentarios. Inicia la conversación.
          </p>
        ) : (
          comments.map((comment: Comment) => {
            const isMine = comment.author.id === user?.id;
            const editing = editingId === comment.id;
            return (
              <div className="flex gap-3" key={comment.id}>
                {comment.author.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img alt={comment.author.name ?? comment.author.email} className="h-8 w-8 shrink-0 rounded-full border border-outline-variant object-cover" src={comment.author.avatarUrl} />
                ) : (
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-outline-variant bg-surface-container-high font-data-mono text-data-mono text-xs text-primary">
                    {(comment.author.name ?? comment.author.email).charAt(0).toUpperCase()}
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                    <span className="font-body-sm text-body-sm font-medium">
                      {comment.author.name ?? comment.author.email}
                    </span>
                    <span className="font-data-mono text-data-mono text-xs text-on-surface-variant">{timeAgo(comment.createdAt)}</span>
                  </div>
                  {editing ? (
                    <div className="mt-1.5 space-y-2">
                      <textarea
                        className="field min-h-[5rem]"
                        onChange={(event) => setEditBody(event.target.value)}
                        value={editBody}
                      />
                      <div className="flex gap-2">
                        <button
                          className="border border-outline-variant px-2.5 py-1 font-body-sm text-body-sm text-primary hover:bg-surface-container-high disabled:opacity-50"
                          disabled={!editBody.trim()}
                          onClick={() => void handleUpdate(comment.id)}
                          type="button"
                        >
                          Guardar
                        </button>
                        <button
                          className="border border-outline-variant px-2.5 py-1 font-body-sm text-body-sm text-on-surface-variant hover:bg-surface-container-high"
                          onClick={() => {
                            setEditingId(null);
                            setEditBody("");
                          }}
                          type="button"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="markdown-comment">
                        <MarkdownPreview content={comment.body} />
                      </div>
                      {isMine && (
                        <div className="mt-1 flex items-center gap-1">
                          <button
                            aria-label="Editar comentario"
                            className="flex items-center gap-1 p-1 font-body-sm text-body-sm text-on-surface-variant hover:text-primary"
                            onClick={() => {
                              setEditingId(comment.id);
                              setEditBody(comment.body);
                            }}
                            type="button"
                          >
                            <Pencil size={13} /> Editar
                          </button>
                          {confirmingId === comment.id ? (
                            <>
                              <button
                                className="flex items-center gap-1 p-1 font-body-sm text-body-sm text-error hover:underline"
                                onClick={() => void handleDelete(comment.id)}
                                type="button"
                              >
                                <Trash2 size={13} /> ¿Borrar?
                              </button>
                              <button
                                className="p-1 text-on-surface-variant hover:text-on-surface"
                                onClick={() => setConfirmingId(null)}
                                type="button"
                              >
                                <X size={13} />
                              </button>
                            </>
                          ) : (
                            <button
                              aria-label="Eliminar comentario"
                              className="flex items-center gap-1 p-1 font-body-sm text-body-sm text-on-surface-variant hover:text-error"
                              onClick={() => setConfirmingId(comment.id)}
                              type="button"
                            >
                              <Trash2 size={13} /> Eliminar
                            </button>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="shrink-0 border-t border-outline-variant pt-3">
        <textarea
          aria-label="Nuevo comentario"
          className="field min-h-[5rem]"
          onChange={(event) => setNewBody(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              void handleCreate();
            }
          }}
          placeholder="Escribe un comentario... (soporta markdown)"
          value={newBody}
        />
        <div className="mt-2 flex justify-end">
          <button
            className="flex items-center gap-1.5 bg-primary px-3 py-1.5 font-body-sm text-body-sm text-on-primary hover:bg-primary-container hover:text-on-primary-container disabled:opacity-50"
            disabled={!newBody.trim() || create.isPending}
            onClick={() => void handleCreate()}
            type="button"
          >
            <Send size={14} /> Comentar
          </button>
        </div>
      </div>
    </div>
  );
}