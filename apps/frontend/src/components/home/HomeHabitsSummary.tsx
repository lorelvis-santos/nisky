"use client";

import { Check, Flame, Settings } from "lucide-react";
import { localDateKey } from "@/lib/utils";
import type { HabitsMatrix } from "@/types/entities";

export function HomeHabitsSummary({
  matrix,
  isError = false,
  onRetry,
  onToggle,
  onOpenManager,
}: {
  matrix: HabitsMatrix | undefined;
  isError?: boolean;
  onRetry?: () => void;
  onToggle: (habitId: string, date: string) => void;
  onOpenManager: () => void;
}) {
  const todayKey = localDateKey(new Date());
  const habits = matrix?.habits ?? [];
  const completedToday = habits.filter((habit) => habit.todayCompleted).length;

  return (
    <section className="space-y-3">
      <header className="flex items-start justify-between gap-3 px-1">
        <div>
          <h2 className="font-headline-xs text-headline-xs font-bold text-on-surface">Hábitos</h2>
          <p className="mt-0.5 font-body-sm text-body-sm text-on-surface-variant">
            {habits.length > 0 ? `${completedToday} de ${habits.length} listos` : "Tu ritmo diario"}
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

      {isError ? (
        <div className="rounded-xl border border-error/30 bg-error-container px-4 py-3 text-on-error-container">
          <p className="font-body-sm text-body-sm">No pudimos cargar tus hábitos.</p>
          {onRetry && <button className="mt-2 font-label-md text-label-md underline" onClick={onRetry} type="button">Reintentar</button>}
        </div>
      ) : habits.length === 0 ? (
        <p className="font-body-sm text-body-sm text-on-surface-variant">
          Aún no tienes hábitos.{" "}
          <button className="text-primary hover:underline" onClick={onOpenManager} type="button">
            Crea el primero.
          </button>
        </p>
      ) : (
        <>
          <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar sm:grid sm:grid-cols-2">
            {habits.slice(0, 4).map((habit) => (
              <button
                aria-pressed={habit.todayCompleted}
                className="flex min-h-[68px] min-w-[150px] items-center gap-2 rounded-2xl border border-outline-variant/70 bg-surface-container-lowest px-3 py-3 text-left shadow-sm transition-colors hover:border-secondary hover:bg-surface-container-low sm:min-w-0 sm:px-4"
                key={habit.id}
                onClick={() => onToggle(habit.id, todayKey)}
                type="button"
              >
                <span
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${habit.todayCompleted ? "border-tertiary bg-tertiary/10 text-tertiary" : "border-outline-variant text-transparent"}`}
                >
                  <Check size={13} strokeWidth={3} />
                </span>
                <span className="min-w-0">
                  <span className="flex items-center gap-1.5 font-body-sm text-body-sm font-medium text-on-surface">
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
          {habits.length > 4 && (
            <p className="mt-2 font-label-caps text-label-caps text-on-surface-variant">
              +{habits.length - 4} hábitos en el registro semanal
            </p>
          )}
        </>
      )}
    </section>
  );
}
