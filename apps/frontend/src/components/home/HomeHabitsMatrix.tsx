"use client";

import { Check, Flame, Settings } from "lucide-react";
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
    <section className="border border-outline-variant bg-surface-container-lowest p-container-padding">
      <header className="mb-3 flex items-center justify-between gap-2">
        <h2 className="font-headline-xs text-headline-xs font-bold text-primary">Hábitos</h2>
        <button
          aria-label="Gestionar hábitos"
          className="flex items-center gap-1.5 p-1 text-on-surface-variant hover:text-on-surface"
          onClick={onOpenManager}
          title="Gestionar hábitos"
          type="button"
        >
          <Settings size={15} />
        </button>
      </header>

      {habits.length === 0 ? (
        <p className="font-body-sm text-body-sm text-on-surface-variant">
          Aún no tienes hábitos.{" "}
          <button className="text-primary hover:underline" onClick={onOpenManager} type="button">
            Crea el primero.
          </button>
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[22rem] border-collapse">
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
                          className={`flex h-6 w-6 items-center justify-center border transition-colors ${isToday ? "border-primary" : "border-outline-variant"} ${completed ? "bg-primary-container text-on-primary-container" : "text-transparent hover:bg-surface-container-high"}`}
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
