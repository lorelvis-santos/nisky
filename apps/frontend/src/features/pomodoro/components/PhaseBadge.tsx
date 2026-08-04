import type { PomodoroPhase } from "@/types/entities";

const labels: Record<PomodoroPhase, string> = { WORK: "Trabajo", SHORT_BREAK: "Descanso corto", LONG_BREAK: "Descanso largo" };
const styles: Record<PomodoroPhase, string> = { WORK: "bg-primary-fixed text-on-primary-fixed", SHORT_BREAK: "bg-secondary-container text-on-secondary-container", LONG_BREAK: "bg-tertiary-fixed text-on-tertiary-fixed" };

export function PhaseBadge({ phase }: { phase: PomodoroPhase }) {
  return <span className={`inline-flex items-center rounded-full border border-outline-variant px-3 py-1 font-data-mono text-data-mono text-xs ${styles[phase]}`}>{labels[phase]}</span>;
}
