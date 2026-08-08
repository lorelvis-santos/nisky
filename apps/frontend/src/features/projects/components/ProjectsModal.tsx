"use client";

import {
  Check,
  FolderKanban,
  Pencil,
  Plus,
  Star,
  Trash2,
  X,
} from "lucide-react";
import { useState } from "react";
import { ColorPicker } from "@/components/ui/ColorPicker";
import { useModalScrollLock } from "@/hooks/useModalScrollLock";
import type { Project } from "@/types/entities";

export function ProjectsModal({
  open,
  projects,
  onClose,
  onCreate,
  onUpdate,
  onDelete,
  onSetDefault,
}: {
  open: boolean;
  projects: Project[];
  onClose: () => void;
  onCreate: (name: string, color: string) => Promise<void>;
  onUpdate: (
    id: string,
    data: { name?: string; color?: string },
  ) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onSetDefault: (id: string) => Promise<void>;
}) {
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [color, setColor] = useState("#303e51");
  const [creatingBusy, setCreatingBusy] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState("#303e51");
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  if (!open) return null;
  return (
    <ModalBody
      color={color}
      confirmingId={confirmingId}
      creating={creating}
      creatingBusy={creatingBusy}
      editColor={editColor}
      editName={editName}
      editingId={editingId}
      name={name}
      onClose={onClose}
      onCreate={onCreate}
      onDelete={onDelete}
      onSetDefault={onSetDefault}
      onUpdate={onUpdate}
      projects={projects}
      setColor={setColor}
      setConfirmingId={setConfirmingId}
      setCreating={setCreating}
      setCreatingBusy={setCreatingBusy}
      setEditColor={setEditColor}
      setEditName={setEditName}
      setEditingId={setEditingId}
      setName={setName}
    />
  );
}

function ModalBody({
  color,
  confirmingId,
  creating,
  creatingBusy,
  editColor,
  editName,
  editingId,
  name,
  onClose,
  onCreate,
  onDelete,
  onSetDefault,
  onUpdate,
  projects,
  setColor,
  setConfirmingId,
  setCreating,
  setCreatingBusy,
  setEditColor,
  setEditName,
  setEditingId,
  setName,
}: {
  color: string;
  confirmingId: string | null;
  creating: boolean;
  creatingBusy: boolean;
  editColor: string;
  editName: string;
  editingId: string | null;
  name: string;
  onClose: () => void;
  onCreate: (name: string, color: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onSetDefault: (id: string) => Promise<void>;
  onUpdate: (
    id: string,
    data: { name?: string; color?: string },
  ) => Promise<void>;
  projects: Project[];
  setColor: (value: string) => void;
  setConfirmingId: (value: string | null) => void;
  setCreating: (value: boolean) => void;
  setCreatingBusy: (value: boolean) => void;
  setEditColor: (value: string) => void;
  setEditName: (value: string) => void;
  setEditingId: (value: string | null) => void;
  setName: (value: string) => void;
}) {
  useModalScrollLock();

  const submitCreate = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setCreatingBusy(true);
    try {
      await onCreate(trimmed, color);
      setCreating(false);
      setName("");
      setColor("#303e51");
    } finally {
      setCreatingBusy(false);
    }
  };

  const submitEdit = async (project: Project) => {
    const payload: { name?: string; color?: string } = {};
    if (editName.trim() && editName.trim() !== project.name)
      payload.name = editName.trim();
    if (editColor !== project.color) payload.color = editColor;
    try {
      await onUpdate(project.id, payload);
      setEditingId(null);
    } catch {
      setEditingId(null);
    }
  };

  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-end bg-on-surface/20 backdrop-blur-[1px] sm:items-center sm:justify-center sm:p-4"
      onClick={onClose}
      role="dialog"
    >
      <div
        className="flex max-h-[85vh] w-full md:max-w-md flex-col border border-outline-variant bg-surface"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-outline-variant bg-surface-bright px-5 py-4">
          <h2 className="flex items-center gap-2 font-headline-xs text-headline-xs font-bold text-primary">
            <FolderKanban size={16} /> Proyectos ({projects.length})
          </h2>
          <button
            aria-label="Cerrar"
            className="text-on-surface-variant hover:text-on-surface"
            onClick={onClose}
            type="button"
          >
            <X size={19} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto" data-modal-scroll>
          {projects.length === 0 && (
            <p className="px-4 py-6 text-center font-body-sm text-body-sm text-on-surface-variant">
              Solo tienes &quot;Personal&quot;. Crea proyectos para organizar
              por contexto.
            </p>
          )}
          {projects.map((project) => {
            const editing = editingId === project.id;
            return (
              <div
                className="border-b border-outline-variant px-4 py-3"
                key={project.id}
              >
                {editing ? (
                  <div className="flex flex-col gap-2">
                    <input
                      className="field"
                      maxLength={100}
                      onChange={(event) => setEditName(event.target.value)}
                      value={editName}
                    />
                    <ColorPicker onChange={setEditColor} value={editColor} />
                    <div className="flex gap-2">
                      <button
                        className="flex flex-1 items-center justify-center gap-1 border border-outline-variant px-2 py-1.5 font-body-sm text-body-sm text-primary hover:bg-surface-container-high"
                        onClick={() => void submitEdit(project)}
                        type="button"
                      >
                        <Check size={14} /> Guardar
                      </button>
                      <button
                        className="flex-1 border border-outline-variant px-2 py-1.5 font-body-sm text-body-sm text-on-surface-variant hover:bg-surface-container-high"
                        onClick={() => setEditingId(null)}
                        type="button"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span
                      aria-hidden="true"
                      className="h-3 w-3 shrink-0 rounded-full"
                      style={{ backgroundColor: project.color }}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-body-md text-body-md font-medium">
                        {project.name}
                      </p>
                      {project.isDefault && (
                        <p className="flex items-center gap-1 font-data-mono text-data-mono text-xs text-primary">
                          <Star size={11} /> Predeterminado
                        </p>
                      )}
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      {!project.isDefault && (
                        <button
                          aria-label={`Hacer ${project.name} predeterminado`}
                          className="p-1.5 text-on-surface-variant hover:text-primary"
                          onClick={() => void onSetDefault(project.id)}
                          title="Hacer predeterminado"
                          type="button"
                        >
                          <Star size={15} />
                        </button>
                      )}
                      <button
                        aria-label={`Editar ${project.name}`}
                        className="p-1.5 text-on-surface-variant hover:text-primary"
                        onClick={() => {
                          setEditingId(project.id);
                          setEditName(project.name);
                          setEditColor(project.color);
                        }}
                        title="Editar"
                        type="button"
                      >
                        <Pencil size={15} />
                      </button>
                      {!project.isDefault &&
                        (confirmingId === project.id ? (
                          <button
                            aria-label={`Confirmar eliminar ${project.name}`}
                            className="p-1.5 font-data-mono text-data-mono text-xs text-error hover:bg-error-container/30"
                            onClick={() => {
                              void onDelete(project.id);
                              setConfirmingId(null);
                            }}
                            title="¿Eliminar?"
                            type="button"
                          >
                            ¿Eliminar?
                          </button>
                        ) : (
                          <button
                            aria-label={`Eliminar ${project.name}`}
                            className="p-1.5 text-on-surface-variant hover:text-error"
                            onClick={() => setConfirmingId(project.id)}
                            title="Eliminar"
                            type="button"
                          >
                            <Trash2 size={15} />
                          </button>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="border-t border-outline-variant p-4">
          {creating ? (
            <div className="flex flex-col gap-2">
              <p className="font-label-caps text-label-caps text-on-surface-variant">
                NUEVO PROYECTO
              </p>
              <input
                autoFocus
                className="field"
                maxLength={100}
                onChange={(event) => setName(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") void submitCreate();
                }}
                placeholder="Nombre del proyecto"
                value={name}
              />
              <ColorPicker onChange={setColor} value={color} />
              <div className="flex gap-2">
                <button
                  className="flex flex-1 items-center justify-center gap-1 border border-outline-variant bg-primary px-2 py-1.5 font-body-sm text-body-sm text-on-primary hover:bg-primary-container hover:text-on-primary-container disabled:opacity-50"
                  disabled={creatingBusy || !name.trim()}
                  onClick={() => void submitCreate()}
                  type="button"
                >
                  <Check size={14} /> Crear
                </button>
                <button
                  className="flex-1 border border-outline-variant px-2 py-1.5 font-body-sm text-body-sm text-on-surface-variant hover:bg-surface-container-high"
                  onClick={() => setCreating(false)}
                  type="button"
                >
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <button
              className="flex w-full items-center justify-center gap-1.5 border border-outline-variant px-3 py-2 font-body-sm text-body-sm text-primary hover:bg-surface-container-high"
              onClick={() => setCreating(true)}
              type="button"
            >
              <Plus size={15} /> Nuevo proyecto
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
