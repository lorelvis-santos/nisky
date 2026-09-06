"use client";

import { Check, Flame, Settings } from "lucide-react";
import { localDateKey } from "@/lib/utils";
import type { HabitsMatrix } from "@/types/entities";

export function HomeHabitsSummary({
  matrix,
  isLoading,
  onToggle,
  onOpenManager,
}: {
  matrix: HabitsMatrix | undefined;
  isLoading: boolean;
  onToggle: (habitId: string, date: string) => void;
  onOpenManager: () => void;
}) {
  const now = new Date();
  const todayKey = localDateKey(now);
  const habits = (matrix?.habits ?? []).filter((habit) => habit.isDueToday);
  const completedToday = habits.filter((habit) => habit.todayCompleted).length;

  return (
    <section className="space-y-3">
      <header className="flex items-start justify-between gap-3 px-1">
        <div>
          <h2 className="font-headline-xs text-headline-xs font-bold text-on-surface">Hábitos de hoy</h2>
          <p className="mt-0.5 font-body-sm text-body-sm text-on-surface-variant">
            {habits.length > 0 ? `${completedToday} de ${habits.length} completados` : "Tu ritmo diario"}
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

      {isLoading ? (
        <p className="font-body-sm text-body-sm text-on-surface-variant">Cargando hábitos...</p>
      ) : matrix?.habits.length === 0 ? (
        <p className="font-body-sm text-body-sm text-on-surface-variant">
          Aún no tienes hábitos.{" "}
          <button className="rounded-md px-1 py-0.5 text-primary hover:bg-surface-container-low hover:underline" onClick={onOpenManager} type="button">
            Crea el primero.
          </button>
        </p>
      ) : habits.length === 0 ? (
        <p className="font-body-sm text-body-sm text-on-surface-variant">
          No hay hábitos programados para hoy.
        </p>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2">
          {habits.map((habit) => (
            <button
              aria-pressed={habit.todayCompleted}
              className="flex min-h-12 items-center gap-3 rounded-lg border border-outline-variant/70 bg-surface-container-lowest px-3 py-2.5 text-left shadow-sm transition-colors hover:border-secondary hover:bg-surface-container-low"
              key={habit.id}
              onClick={() => onToggle(habit.id, todayKey)}
              type="button"
            >
              <span
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${habit.todayCompleted ? "border-tertiary bg-tertiary text-on-primary" : "border-outline-variant text-transparent"}`}
              >
                <Check size={13} strokeWidth={3} />
              </span>
              <span className="min-w-0">
                <span className={`flex items-center gap-1.5 font-body-sm text-body-sm font-medium ${habit.todayCompleted ? "text-on-surface-variant line-through" : "text-on-surface"}`}>
                  {habit.color && (
                    <span
                      aria-hidden="true"
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ backgroundColor: habit.color }}
                    />
                  )}
                  <span className="truncate">{habit.name}</span>
                </span>
                <span className="mt-0.5 flex items-center gap-1 font-data-mono text-data-mono text-[11px] text-on-surface-variant">
                  <Flame size={11} className={habit.streak > 0 ? "text-tertiary" : ""} />
                  {habit.streak} días
                </span>
              </span>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
