import { ChevronLeft, ChevronRight } from "lucide-react";

export function WeekNavigation({
  label,
  onPrevious,
  onToday,
  onNext,
}: {
  label: string;
  onPrevious: () => void;
  onToday: () => void;
  onNext: () => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <button
        aria-label="Semana anterior"
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
        aria-label="Semana siguiente"
        className="border border-outline-variant bg-surface-container-lowest px-3 py-1.5 hover:bg-surface-container-high"
        onClick={onNext}
        type="button"
      >
        <ChevronRight size={16} />
      </button>
      <span className="hidden font-data-mono text-data-mono text-xs text-on-surface-variant sm:inline">
        {label}
      </span>
    </div>
  );
}
