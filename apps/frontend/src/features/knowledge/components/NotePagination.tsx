"use client";

import { ChevronLeft, ChevronRight, LoaderCircle } from "lucide-react";
import type { PaginationMeta } from "@/types/entities";

export function NotePagination({ meta, isFetching, onPageChange }: { meta?: PaginationMeta; isFetching?: boolean; onPageChange: (page: number) => void }) {
  if (!meta || meta.totalPages <= 1) return null;

  return (
    <nav aria-label="Paginación de notas" className="flex items-center justify-center gap-2 border-t border-outline-variant px-3 py-3">
      <button
        aria-label="Página anterior"
        className="flex min-h-11 items-center gap-1 rounded-lg border border-outline-variant px-2.5 font-body-sm text-body-sm text-on-surface-variant hover:bg-surface-container-low hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
        disabled={isFetching || meta.currentPage <= 1}
        onClick={() => onPageChange(meta.currentPage - 1)}
        type="button"
      >
        <ChevronLeft size={14} /> <span className="hidden sm:inline">Anterior</span>
      </button>
      <span aria-live="polite" className="flex items-center gap-1.5 text-center font-data-mono text-data-mono text-[11px] text-on-surface-variant">
        {isFetching && <LoaderCircle aria-hidden="true" className="animate-spin" size={13} />}
        <span>Página {meta.currentPage} de {meta.totalPages}</span>
        <span className="hidden sm:inline">({meta.totalItems} notas)</span>
      </span>
      <button
        aria-label="Página siguiente"
        className="flex min-h-11 items-center gap-1 rounded-lg border border-outline-variant px-2.5 font-body-sm text-body-sm text-on-surface-variant hover:bg-surface-container-low hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
        disabled={isFetching || meta.currentPage >= meta.totalPages}
        onClick={() => onPageChange(meta.currentPage + 1)}
        type="button"
      >
        <span className="hidden sm:inline">Siguiente</span> <ChevronRight size={14} />
      </button>
    </nav>
  );
}
