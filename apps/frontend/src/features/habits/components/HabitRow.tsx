import { CheckCircle2, Circle, Flame } from "lucide-react";
import type { Habit } from "@/types/entities";

export function HabitRow({ habit, onToggle }: { habit: Habit; onToggle: () => void }) {
  return (
    <div className="flex items-center gap-3 px-2 py-2 hover:bg-surface-container-low">
      <button
        aria-label={habit.todayCompleted ? `Desmarcar ${habit.name}` : `Marcar ${habit.name}`}
        className="shrink-0 text-outline hover:text-primary"
        onClick={onToggle}
        type="button"
      >
        {habit.todayCompleted ? <CheckCircle2 className="text-primary" size={18} /> : <Circle size={18} />}
      </button>
      <span className={`flex-1 font-body-sm text-body-sm ${habit.todayCompleted ? "text-on-surface-variant line-through" : ""}`}>
        {habit.name}
      </span>
      {habit.streak > 0 && (
        <span className="flex items-center gap-1 font-data-mono text-data-mono text-xs text-tertiary" title={`${habit.streak} días de racha`}>
          <Flame size={13} /> {habit.streak}
        </span>
      )}
    </div>
  );
}
