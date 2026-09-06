"use client";

import { ChevronLeft, ChevronRight, LoaderCircle } from "lucide-react";
import type { PaginationMeta } from "@/types/entities";

export function TaskPagination({
  meta,
  isFetching,
  onPageChange,
}: {
  meta: PaginationMeta;
  isFetching?: boolean;
  onPageChange: (page: number) => void;
}) {
  if (meta.totalPages <= 1) return null;

  return (
    <nav aria-label="Paginacion de tareas" className="flex items-center justify-center gap-2 border-t border-outline-variant px-3 py-3">
      <button
        aria-label="Pagina anterior"
        className="flex items-center gap-1 rounded-lg border border-outline-variant px-2 py-1.5 font-body-sm text-body-sm text-on-surface-variant hover:bg-surface-container-low hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
        disabled={isFetching || meta.currentPage <= 1}
        onClick={() => onPageChange(meta.currentPage - 1)}
        type="button"
      >
        <ChevronLeft size={14} /> Anterior
      </button>
      <span className="flex items-center gap-1.5 text-center font-data-mono text-data-mono text-[11px] text-on-surface-variant">
        {isFetching && <LoaderCircle aria-hidden="true" className="animate-spin" size={13} />}
        <span>Pagina {meta.currentPage} de {meta.totalPages}</span>
        <span className="hidden sm:inline">({meta.totalItems} tareas)</span>
      </span>
      <button
        aria-label="Pagina siguiente"
        className="flex items-center gap-1 rounded-lg border border-outline-variant px-2 py-1.5 font-body-sm text-body-sm text-on-surface-variant hover:bg-surface-container-low hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
        disabled={isFetching || meta.currentPage >= meta.totalPages}
        onClick={() => onPageChange(meta.currentPage + 1)}
        type="button"
      >
        Siguiente <ChevronRight size={14} />
      </button>
    </nav>
  );
}
