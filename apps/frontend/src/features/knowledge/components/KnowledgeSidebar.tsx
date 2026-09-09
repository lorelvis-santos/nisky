"use client";

import type { KnowledgeFacets, Project } from "@/types/entities";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export type KnowledgeFilter =
  | { type: "category" | "tag"; name: string }
  | { type: "project"; id: string | null; name: string }
  | null;

const ALL_PROJECTS_VALUE = "__all_projects__";
const WITHOUT_PROJECT_VALUE = "__without_project__";

export function KnowledgeSidebar({
  facets,
  projects = [],
  active,
  onFilter,
}: {
  facets: KnowledgeFacets | undefined;
  projects?: Project[];
  active: KnowledgeFilter;
  onFilter: (filter: KnowledgeFilter) => void;
}) {
  const categories = facets?.categories ?? [];
  const tags = facets?.tags ?? [];
  const projectFilter = active?.type === "project" ? active : null;
  const selectedProjectValue = projectFilter
    ? projectFilter.id ?? WITHOUT_PROJECT_VALUE
    : ALL_PROJECTS_VALUE;

  const chipClass = (selected: boolean) =>
    `flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left font-body-sm text-body-sm transition-colors hover:bg-surface-container-high ${selected ? "bg-secondary-fixed font-medium text-secondary" : "text-on-surface-variant"}`;

  return (
    <aside className="min-h-0 flex-col rounded-lg border border-outline-variant/70 bg-surface-container-lowest shadow-sm lg:sticky lg:top-4 lg:flex lg:h-fit">
      <div className="flex shrink-0 items-center justify-between border-b border-outline-variant p-4">
        <span className="font-label-caps text-label-caps text-on-surface-variant">FILTROS</span>
        <button
           className="rounded-md px-2 py-1 font-body-sm text-body-sm text-primary hover:bg-surface-container-low hover:underline"
          onClick={() => onFilter(null)}
          type="button"
        >
          Limpiar
        </button>
      </div>
      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-4">
        <section>
          <h2 className="font-label-caps text-label-caps text-on-surface-variant">CATEGORÍAS</h2>
          <div className="mt-1 space-y-0.5">
            <button className={chipClass(!active)} onClick={() => onFilter(null)} type="button">
              <span>Todas</span>
              <span className="font-data-mono text-data-mono text-xs">{categories.reduce((sum, item) => sum + item.count, 0)}</span>
            </button>
            {categories.map((item) => (
              <button
                className={chipClass(active?.type === "category" && active.name === item.name)}
                key={item.name}
                onClick={() => onFilter(active?.type === "category" && active.name === item.name ? null : { type: "category", name: item.name })}
                type="button"
              >
                <span className="truncate">{item.name}</span>
                <span className="font-data-mono text-data-mono text-xs">{item.count}</span>
              </button>
            ))}
            {categories.length === 0 && <p className="px-3 py-2 font-body-sm text-body-sm text-on-surface-variant">Sin categorías aún.</p>}
          </div>
        </section>
        {projects.length > 0 && (
          <section>
            <h2 className="font-label-caps text-label-caps text-on-surface-variant">PROYECTOS</h2>
            <Select
              onValueChange={(value) => {
                if (value === ALL_PROJECTS_VALUE) {
                  if (active?.type === "project") onFilter(null);
                  return;
                }
                if (value === WITHOUT_PROJECT_VALUE) {
                  onFilter({ type: "project", id: null, name: "Sin proyecto" });
                  return;
                }
                const project = projects.find((item) => item.id === value);
                if (project) onFilter({ type: "project", id: project.id, name: project.name });
              }}
              value={selectedProjectValue}
            >
              <SelectTrigger aria-label="Filtrar notas por proyecto" className="mt-1 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_PROJECTS_VALUE}>Todos los proyectos</SelectItem>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    <span className="flex min-w-0 items-center gap-2">
                      <span aria-hidden="true" className="size-2 shrink-0 rounded-full" style={{ backgroundColor: project.color }} />
                      <span className="truncate">{project.name}</span>
                    </span>
                  </SelectItem>
                ))}
                <SelectItem value={WITHOUT_PROJECT_VALUE}>Sin proyecto</SelectItem>
              </SelectContent>
            </Select>
          </section>
        )}
        <section>
          <h2 className="font-label-caps text-label-caps text-on-surface-variant">ETIQUETAS</h2>
          <div className="mt-1 space-y-0.5">
            {tags.map((item) => (
              <button
                className={chipClass(active?.type === "tag" && active.name === item.name)}
                key={item.name}
                onClick={() => onFilter(active?.type === "tag" && active.name === item.name ? null : { type: "tag", name: item.name })}
                type="button"
              >
                <span className="truncate">#{item.name}</span>
                <span className="font-data-mono text-data-mono text-xs">{item.count}</span>
              </button>
            ))}
            {tags.length === 0 && <p className="px-3 py-2 font-body-sm text-body-sm text-on-surface-variant">Sin etiquetas aún.</p>}
          </div>
        </section>
      </div>
    </aside>
  );
}
