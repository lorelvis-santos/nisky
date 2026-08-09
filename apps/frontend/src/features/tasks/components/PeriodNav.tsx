import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";

export function PeriodNav({
  label,
  onPrevious,
  onToday,
  onNext,
  previousLabel,
  nextLabel,
  onJumpPrevious,
  onJumpNext,
  jumpPreviousLabel,
  jumpNextLabel,
}: {
  label: string;
  onPrevious: () => void;
  onToday: () => void;
  onNext: () => void;
  previousLabel: string;
  nextLabel: string;
  onJumpPrevious?: () => void;
  onJumpNext?: () => void;
  jumpPreviousLabel?: string;
  jumpNextLabel?: string;
}) {
  return (
    <div className="flex items-center gap-2">
      {onJumpPrevious && (
        <button
          aria-label={jumpPreviousLabel ?? "Saltar atrás"}
          className="border border-outline-variant bg-surface-container-lowest px-3 py-1.5 hover:bg-surface-container-high"
          onClick={onJumpPrevious}
          type="button"
        >
          <ChevronsLeft size={16} />
        </button>
      )}
      <button
        aria-label={previousLabel}
        className="border border-outline-variant bg-surface-container-lowest px-3 py-1.5 hover:bg-surface-container-high"
        onClick={onPrevious}
        type="button"
      >
        <ChevronLeft size={16} />
      </button>
      <button
        className="border border-outline-variant bg-surface-container-lowest px-3 py-1.5 font-body-sm text-body-sm hover:bg-surface-container-high"
        onClick={onToday}
        type="button"
      >
        Hoy
      </button>
      <button
        aria-label={nextLabel}
        className="border border-outline-variant bg-surface-container-lowest px-3 py-1.5 hover:bg-surface-container-high"
        onClick={onNext}
        type="button"
      >
        <ChevronRight size={16} />
      </button>
      {onJumpNext && (
        <button
          aria-label={jumpNextLabel ?? "Saltar adelante"}
          className="border border-outline-variant bg-surface-container-lowest px-3 py-1.5 hover:bg-surface-container-high"
          onClick={onJumpNext}
          type="button"
        >
          <ChevronsRight size={16} />
        </button>
      )}
      <span className="hidden font-data-mono text-data-mono text-xs text-on-surface-variant sm:inline">
        {label}
      </span>
    </div>
  );
}