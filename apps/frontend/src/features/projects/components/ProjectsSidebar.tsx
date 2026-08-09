"use client";

import { Inbox, Plus, Settings } from "lucide-react";
import type { Project } from "@/types/entities";

export function ProjectsSidebar({
  projects,
  selectedProjectId,
  onSelect,
  onManage,
  taskCounts,
}: {
  projects: Project[];
  selectedProjectId: string | null;
  onSelect: (projectId: string | null) => void;
  onManage: () => void;
  taskCounts: Record<string, number>;
}) {
  const pendingCount = projects.reduce((sum, project) => sum + (taskCounts[project.id] ?? 0), 0);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center justify-between gap-2 border-b border-outline-variant px-4 py-3">
        <h2 className="font-label-caps text-label-caps text-on-surface-variant">PROYECTOS</h2>
        <button
          aria-label="Gestionar proyectos"
          className="p-1 text-on-surface-variant hover:text-primary"
          onClick={onManage}
          title="Gestionar proyectos"
          type="button"
        >
          <Settings size={15} />
        </button>
      </div>

      <nav className="min-h-0 flex-1 overflow-y-auto py-2">
        <button
          aria-current={selectedProjectId === null ? "page" : undefined}
          className={`flex w-full items-center gap-2 border-l-2 px-4 py-2 text-left font-body-md text-body-md ${selectedProjectId === null ? "border-primary bg-surface-container-low font-medium" : "border-transparent text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface"}`}
          onClick={() => onSelect(null)}
          type="button"
        >
          <Inbox size={15} className="shrink-0" />
          <span className="min-w-0 flex-1 truncate">Todos</span>
          <span className="font-data-mono text-data-mono text-xs text-on-surface-variant">{pendingCount}</span>
        </button>

        {projects.map((project) => {
          const active = selectedProjectId === project.id;
          return (
            <button
              aria-current={active ? "page" : undefined}
              className={`flex w-full items-center gap-2 border-l-2 px-4 py-2 text-left font-body-md text-body-md ${active ? "border-primary bg-surface-container-low font-medium" : "border-transparent text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface"}`}
              key={project.id}
              onClick={() => onSelect(project.id)}
              type="button"
            >
              <span aria-hidden="true" className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: project.color }} />
              <span className="min-w-0 flex-1 truncate">{project.name}</span>
              <span className="font-data-mono text-data-mono text-xs text-on-surface-variant">{taskCounts[project.id] ?? 0}</span>
            </button>
          );
        })}

        {projects.length === 0 && (
          <p className="px-4 py-3 font-body-sm text-body-sm text-on-surface-variant">
            Solo tienes &quot;Personal&quot;.{" "}
            <button className="inline-flex items-center gap-1 text-primary hover:underline" onClick={onManage} type="button">
              <Plus size={13} /> Crear proyecto
            </button>
          </p>
        )}
      </nav>
    </div>
  );
}
