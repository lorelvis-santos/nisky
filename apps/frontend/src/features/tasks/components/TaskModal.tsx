"use client";

import { useState } from "react";
import { X } from "lucide-react";
import type { Task, TaskPriority } from "@/types/entities";
import { useTaskQuery } from "../hooks/useTasks";
import { taskSchema } from "../schemas/task.schema";

export type TaskForm = {
  title: string;
  description?: string;
  priority: TaskPriority;
  dueDate?: string;
};

const emptyForm: TaskForm = {
  title: "",
  description: "",
  priority: "NORMAL",
  dueDate: "",
};

export function TaskModal({
  task,
  onClose,
  onSave,
  onAddSubtask,
  onToggleSubtask,
  onDeleteSubtask,
}: {
  task: Task | null;
  onClose: () => void;
  onSave: (form: TaskForm) => Promise<void>;
  onAddSubtask: (taskId: string, title: string) => Promise<void>;
  onToggleSubtask: (
    taskId: string,
    subtaskId: string,
    completed: boolean,
  ) => Promise<void>;
  onDeleteSubtask: (taskId: string, subtaskId: string) => Promise<void>;
}) {
  const { data: detail } = useTaskQuery(task?.id ?? null);
  const current = detail ?? task;
  const [form, setForm] = useState<TaskForm>(() =>
    task
      ? {
          title: task.title,
          description: task.description ?? "",
          priority: task.priority,
          dueDate: task.dueDate ? task.dueDate.slice(0, 10) : "",
        }
      : emptyForm,
  );
  const [subtaskTitle, setSubtaskTitle] = useState("");
  const [error, setError] = useState("");

  if (!task && current) return null;
  const subtasks = current?.subtasks ?? [];
  const submit = async () => {
    const result = taskSchema.safeParse(form);
    if (!result.success) {
      setError(result.error.issues[0]?.message ?? "Revisa los datos");
      return;
    }
    setError("");
    await onSave(result.data);
  };
  const addSubtask = async () => {
    if (!current || !subtaskTitle.trim()) return;
    await onAddSubtask(current.id, subtaskTitle.trim());
    setSubtaskTitle("");
  };

  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-[60] flex items-center justify-center bg-on-surface/20 p-4 backdrop-blur-[1px]"
      role="dialog"
    >
      <div className="flex max-h-[90vh] w-full max-w-lg flex-col border border-outline-variant bg-surface shadow-none">
        <div className="flex items-center justify-between border-b border-outline-variant bg-surface-bright px-5 py-4">
          <h2 className="font-headline-xs text-headline-xs font-bold text-primary">
            {task ? "Editar tarea" : "Nueva tarea"}
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
        <div className="space-y-4 overflow-y-auto p-5">
          <label className="block">
            <span className="font-label-caps text-label-caps text-on-surface-variant">
              TÍTULO
            </span>
            <input
              autoFocus
              className="field mt-1"
              onChange={(event) =>
                setForm({ ...form, title: event.target.value })
              }
              value={form.title}
            />
          </label>
          <label className="block">
            <span className="font-label-caps text-label-caps text-on-surface-variant">
              DESCRIPCIÓN
            </span>
            <textarea
              className="field mt-1 h-20 resize-y py-2"
              onChange={(event) =>
                setForm({ ...form, description: event.target.value })
              }
              value={form.description}
            />
          </label>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="font-label-caps text-label-caps text-on-surface-variant">
                PRIORIDAD
              </span>
              <select
                className="field mt-1"
                onChange={(event) =>
                  setForm({
                    ...form,
                    priority: event.target.value as TaskPriority,
                  })
                }
                value={form.priority}
              >
                <option value="URGENT">Urgente</option>
                <option value="HIGH">Alta</option>
                <option value="NORMAL">Normal</option>
                <option value="LOW">Baja</option>
              </select>
            </label>
            <label className="block">
              <span className="font-label-caps text-label-caps text-on-surface-variant">
                FECHA LÍMITE
              </span>
              <input
                className="field mt-1"
                onChange={(event) =>
                  setForm({ ...form, dueDate: event.target.value })
                }
                type="date"
                value={form.dueDate}
              />
            </label>
          </div>
          {task && current && (
            <section className="border-t border-outline-variant pt-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="font-label-caps text-label-caps text-on-surface-variant">
                  SUBTAREAS
                </span>
                <span className="font-data-mono text-data-mono text-xs text-on-surface-variant">
                  {subtasks.filter((subtask) => subtask.completed).length}/
                  {subtasks.length}
                </span>
              </div>
              <div className="mb-2 flex gap-2">
                <input
                  className="field h-8"
                  onChange={(event) => setSubtaskTitle(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") void addSubtask();
                  }}
                  placeholder="Añadir subtarea..."
                  value={subtaskTitle}
                />
                <button
                  className="border border-outline-variant px-3 text-body-sm hover:bg-surface-container-high"
                  onClick={() => void addSubtask()}
                  type="button"
                >
                  Añadir
                </button>
              </div>
              <div className="space-y-1">
                {subtasks.map((subtask) => (
                  <div
                    className="flex items-center gap-2 border-b border-outline-variant py-2"
                    key={subtask.id}
                  >
                    <input
                      checked={subtask.completed}
                      className="h-4 w-4 accent-primary"
                      onChange={() =>
                        void onToggleSubtask(
                          current.id,
                          subtask.id,
                          !subtask.completed,
                        )
                      }
                      type="checkbox"
                    />
                    <span
                      className={`flex-1 font-body-sm text-body-sm ${subtask.completed ? "line-through text-on-surface-variant" : ""}`}
                    >
                      {subtask.title}
                    </span>
                    <button
                      className="text-xs text-on-surface-variant hover:text-error"
                      onClick={() =>
                        void onDeleteSubtask(current.id, subtask.id)
                      }
                      type="button"
                    >
                      Eliminar
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}
          {error && (
            <p className="font-body-sm text-body-sm text-error">{error}</p>
          )}
        </div>
        <div className="flex justify-end gap-3 border-t border-outline-variant bg-surface-container-low px-5 py-4">
          <button
            className="border border-outline-variant bg-surface-container-lowest px-4 py-2 font-body-sm text-body-sm hover:bg-surface-container-high"
            onClick={onClose}
            type="button"
          >
            Cancelar
          </button>
          <button
            className="bg-primary-container px-4 py-2 font-body-sm text-body-sm text-on-primary hover:bg-primary"
            onClick={() => void submit()}
            type="button"
          >
            {task ? "Guardar cambios" : "Crear tarea"}
          </button>
        </div>
      </div>
    </div>
  );
}
