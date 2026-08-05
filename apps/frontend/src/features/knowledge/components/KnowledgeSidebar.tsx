"use client";

import type { KnowledgeFacets } from "@/types/entities";

type Filter = { type: "category" | "tag"; name: string } | null;

export function KnowledgeSidebar({
  facets,
  active,
  onFilter,
}: {
  facets: KnowledgeFacets | undefined;
  active: Filter;
  onFilter: (filter: Filter) => void;
}) {
  const categories = facets?.categories ?? [];
  const tags = facets?.tags ?? [];

  const chipClass = (selected: boolean) =>
    `flex w-full items-center justify-between gap-2 px-2 py-1.5 text-left font-body-sm text-body-sm hover:bg-surface-container-high ${selected ? "bg-surface-container-high font-medium text-primary" : "text-on-surface-variant"}`;

  return (
    <aside className="min-h-0 flex-col border border-outline-variant bg-surface-container-lowest lg:flex lg:h-full">
      <div className="flex shrink-0 items-center justify-between border-b border-outline-variant p-container-padding">
        <span className="font-label-caps text-label-caps text-on-surface-variant">FILTROS</span>
        <button
          className="font-body-sm text-body-sm text-primary hover:underline"
          onClick={() => onFilter(null)}
          type="button"
        >
          Limpiar
        </button>
      </div>
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-container-padding">
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
            {categories.length === 0 && <p className="px-2 py-1 font-body-sm text-body-sm text-on-surface-variant">Sin categorías aún.</p>}
          </div>
        </section>
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
            {tags.length === 0 && <p className="px-2 py-1 font-body-sm text-body-sm text-on-surface-variant">Sin etiquetas aún.</p>}
          </div>
        </section>
      </div>
    </aside>
  );
}
