import type { PomodoroPhase } from "@/types/entities";
import { PhaseBadge } from "./PhaseBadge";

function clock(seconds: number) {
  const safe = Math.max(0, seconds);
  return `${String(Math.floor(safe / 60)).padStart(2, "0")}:${String(safe % 60).padStart(2, "0")}`;
}

export function TimerDisplay({ remainingSec, phase, cycleIndex, cyclesPerLong }: { remainingSec: number; phase: PomodoroPhase; cycleIndex: number; cyclesPerLong: number }) {
  return <div className="flex flex-col items-center gap-4"><PhaseBadge phase={phase} /><div aria-live="polite" className="select-none font-data-mono text-[clamp(5rem,18vw,8rem)] font-medium leading-none tracking-[-0.05em] text-primary">{clock(remainingSec)}</div><span className="font-data-mono text-data-mono text-sm text-on-surface-variant">Ciclo {cycleIndex} de {cyclesPerLong}</span></div>;
}
