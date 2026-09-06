"use client";

import { Check, Flame, Settings, Sparkles } from "lucide-react";
import { useMemo } from "react";
import { localDateKey } from "@/lib/utils";
import type { HabitsMatrix } from "@/types/entities";

const WEEK_LABELS = ["L", "M", "X", "J", "V", "S", "D"];

function currentWeekKeys() {
  const now = new Date();
  const result = new Date(now);
  result.setHours(0, 0, 0, 0);
  const day = result.getDay();
  result.setDate(result.getDate() - (day === 0 ? 6 : day - 1));
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(result);
    date.setDate(result.getDate() + index);
    return localDateKey(date);
  });
}

export function HomeHabitsMatrix({
  matrix,
  onToggle,
  onOpenManager,
}: {
  matrix: HabitsMatrix | undefined;
  onToggle: (habitId: string, date: string) => void;
  onOpenManager: () => void;
}) {
  const weekKeys = useMemo(() => currentWeekKeys(), []);
  const todayKey = localDateKey(new Date());
  const habits = matrix?.habits ?? [];
  const entries = matrix?.entries ?? [];

  return (
    <section className="space-y-3 rounded-lg border border-outline-variant bg-surface-container-lowest p-container-padding shadow-sm">
      <header className="flex items-start justify-between gap-3">
        <div>
          <p className="font-label-caps text-label-caps text-primary">SEGUIMIENTO</p>
          <h2 className="mt-1 font-headline-xs text-headline-xs font-bold text-on-surface">Registro semanal</h2>
          <p className="mt-0.5 hidden font-body-sm text-body-sm text-on-surface-variant sm:block">
            Marca tus hábitos y conserva el ritmo.
          </p>
        </div>
        <button
          aria-label="Gestionar hábitos"
          className="flex h-8 w-8 items-center justify-center rounded-full border border-transparent text-on-surface-variant hover:border-outline-variant hover:bg-surface-container-low hover:text-on-surface"
          onClick={onOpenManager}
          title="Gestionar hábitos"
          type="button"
        >
          <Settings size={15} />
        </button>
      </header>

      {habits.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-primary/30 bg-primary-fixed/30 px-4 py-7 text-center">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-fixed text-primary">
            <Sparkles aria-hidden="true" size={18} />
          </span>
          <div>
            <p className="font-body-sm text-body-sm font-semibold text-on-surface">Empieza tu ritmo</p>
            <p className="mt-1 max-w-sm font-body-sm text-body-sm text-on-surface-variant">
              Crea un hábito pequeño y usa este registro para ver cómo avanzas durante la semana.
            </p>
          </div>
          <button className="min-h-10 rounded-md bg-primary px-3.5 py-2 font-label-md text-label-md font-semibold text-on-primary transition-colors hover:bg-primary/90" onClick={onOpenManager} type="button">
            Crear primer hábito
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[24rem] border-collapse">
            <thead>
              <tr>
                <th className="w-full pr-3 text-left font-label-caps text-label-caps text-on-surface-variant">HÁBITO</th>
                {weekKeys.map((key, index) => (
                  <th
                    className={`px-0.5 pb-1 text-center font-label-caps text-label-caps ${key === todayKey ? "text-primary" : "text-on-surface-variant"}`}
                    key={key}
                  >
                    {WEEK_LABELS[index]}
                  </th>
                ))}
                <th className="pl-3 text-right font-label-caps text-label-caps text-on-surface-variant">RACHA</th>
              </tr>
            </thead>
            <tbody>
              {habits.map((habit) => (
                <tr className="border-t border-outline-variant" key={habit.id}>
                  <td className="py-1.5 pr-3">
                    <p className="flex items-center gap-2 font-body-sm text-body-sm">
                      {habit.color && <span aria-hidden="true" className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: habit.color }} />}
                      <span className="truncate">{habit.name}</span>
                    </p>
                  </td>
                  {weekKeys.map((key) => {
                    const completed = entries.some((entry) => entry.habitId === habit.id && entry.date.slice(0, 10) === key && entry.completed);
                    const isToday = key === todayKey;
                    return (
                      <td className="px-0.5 py-1 text-center" key={key}>
                        <button
                          aria-label={`${habit.name} ${key} ${completed ? "desmarcar" : "marcar"}`}
                          aria-pressed={completed}
                          className={`flex h-6 w-6 items-center justify-center rounded-full border transition-colors ${isToday ? "border-secondary" : "border-outline-variant"} ${completed ? "border-tertiary bg-tertiary text-on-primary" : "text-transparent hover:bg-surface-container-high"}`}
                          onClick={() => onToggle(habit.id, key)}
                          type="button"
                        >
                          <Check size={14} strokeWidth={3} />
                        </button>
                      </td>
                    );
                  })}
                  <td className="py-1.5 pl-3 text-right">
                    <span className="flex items-center justify-end gap-1 font-data-mono text-data-mono text-xs text-on-surface-variant">
                      <Flame size={13} className={habit.streak > 0 ? "text-primary" : ""} /> {habit.streak}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
