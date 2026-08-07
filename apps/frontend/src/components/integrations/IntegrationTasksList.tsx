"use client";

import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { getIntegrationTasks, type IntegrationTaskFilter } from "@/features/integrations/api/integrations";
import type { IntegrationProvider, Task } from "@/types/entities";

const PROVIDER_LABEL: Record<IntegrationProvider, string> = {
  MOODLE: "Moodle",
  CANVAS: "Canvas",
};

const KIND_LABEL: Record<string, string> = {
  assignment: "Entrega",
  quiz: "Cuestionario",
  forum: "Foro",
  resource: "Recurso",
  discussion_topic: "Discusión",
  page: "Página",
  ungraded_quiz: "Cuestionario",
  todo: "Por hacer",
  gradient_assignment: "Entrega",
};

function courseFromDescription(description: string | null) {
  return description?.split("\n")[0] ?? null;
}

function linkFromDescription(description: string | null) {
  const match = description?.match(/Link: (https?:\/\/\S+)/);
  return match?.[1] ?? null;
}

export function IntegrationTasksList({ provider }: { provider: IntegrationProvider }) {
  const [filter, setFilter] = useState<IntegrationTaskFilter>("pending");

  const { data, isLoading, error } = useQuery({
    queryKey: ["integration-tasks", provider, filter],
    queryFn: () => getIntegrationTasks(provider, filter, 100),
  });

  const tasks = data ?? [];

  return (
    <section className="space-y-4">
      <div className="flex max-w-2xl items-center justify-between gap-2">
        <h2 className="font-headline-xs text-headline-xs">Tareas de {PROVIDER_LABEL[provider]}</h2>
        <div className="flex gap-1">
          {(["pending", "overdue", "all"] as const).map((f) => (
            <button
              className={`px-3 py-1.5 font-label-caps text-label-caps uppercase ${filter === f ? "bg-primary-container text-on-primary" : "text-on-surface-variant hover:text-on-surface"}`}
              key={f}
              onClick={() => setFilter(f)}
              type="button"
            >
              {f === "pending" ? "Próximas" : f === "overdue" ? "Atrasadas" : "Todas"}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <p className="flex items-center gap-2 font-body-sm text-body-sm text-on-surface-variant"><Loader2 className="animate-spin" size={16} /> Cargando…</p>
      ) : error ? (
        <p className="font-body-sm text-body-sm text-error">No se pudieron cargar las tareas.</p>
      ) : tasks.length === 0 ? (
        <p className="max-w-2xl border border-outline-variant bg-surface-container-lowest p-container-padding font-body-sm text-body-sm text-on-surface-variant">
          No hay tareas{filter === "overdue" ? " atrasadas" : filter === "pending" ? " próximas" : ""}. Conecta {PROVIDER_LABEL[provider].toLowerCase()} en Ajustes.
        </p>
      ) : (
        <ul className="max-w-2xl divide-y divide-outline-variant border border-outline-variant bg-surface-container-lowest">
          {tasks.map((task: Task) => {
            const due = task.dueDate ? new Date(task.dueDate) : null;
            const isOver = task.status === "PENDING" && due !== null && due < new Date();
            const link = linkFromDescription(task.description);
            const course = courseFromDescription(task.description);
            const kind = kindFromSourceRef(provider, task.sourceRef);
            return (
              <li className="flex items-start gap-3 p-container-padding" key={task.id}>
                <span className={`mt-1.5 size-2 shrink-0 rounded-full ${isOver ? "bg-error" : task.priority === "URGENT" || task.priority === "HIGH" ? "bg-tertiary" : "bg-primary"}`} />
                <div className="min-w-0 flex-1">
                  {link ? (
                    <a className="block text-body-md font-medium text-on-surface hover:text-primary" href={link} rel="noreferrer" target="_blank">
                      {task.title}
                    </a>
                  ) : (
                    <span className="block text-body-md font-medium text-on-surface">{task.title}</span>
                  )}
                  <p className="mt-0.5 truncate font-body-sm text-body-sm text-on-surface-variant">
                    {course ?? "Curso sin nombre"}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <span className="font-data-mono text-data-mono text-xs">{due ? due.toLocaleString() : "Sin fecha"}</span>
                  <span className="mt-1 block font-label-caps text-label-caps uppercase text-on-surface-variant">
                    {KIND_LABEL[kind] ?? kind}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function kindFromSourceRef(provider: IntegrationProvider, sourceRef: string | null): string {
  if (!sourceRef) return "task";
  const segments = sourceRef.split(":");
  if (provider === "CANVAS") return segments[2] ?? "todo";
  return segments[4] ?? segments[1] ?? "task";
}