"use client";

import { useMemo } from "react";
import { localDateKey } from "@/lib/utils";
import type { HomeActivityPoint } from "@/types/entities";

const WEEK_LABELS = ["L", "M", "X", "J", "V", "S", "D"];

function mondayOf(date: Date) {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  const day = result.getDay();
  result.setDate(result.getDate() - (day === 0 ? 6 : day - 1));
  return result;
}

function levelClass(level: number) {
  if (level >= 4) return "bg-primary";
  if (level === 3) return "bg-primary/80";
  if (level === 2) return "bg-primary/55";
  if (level === 1) return "bg-primary/30";
  return "bg-surface-container-high";
}

export function ActivityHeatmap({ activity }: { activity: HomeActivityPoint[] | undefined }) {
  const grid = useMemo(() => {
    const byDate = new Map<string, HomeActivityPoint>();
    for (const point of activity ?? []) byDate.set(point.date, point);

    const thisMonday = mondayOf(new Date());
    const columns: { date: string; level: number; label: string }[][] = [];
    for (let week = 0; week < 12; week += 1) {
      const weekStart = new Date(thisMonday);
      weekStart.setDate(thisMonday.getDate() - (11 - week) * 7);
      const days = Array.from({ length: 7 }, (_, day) => {
        const date = new Date(weekStart);
        date.setDate(weekStart.getDate() + day);
        const key = localDateKey(date);
        const point = byDate.get(key);
        const total = point ? point.tasks + point.habits + point.pomodoro : 0;
        return {
          date: key,
          level: Math.min(4, total),
          label: point
            ? `${key}: ${point.tasks} tareas · ${point.habits} hábitos · ${point.pomodoro} pomodoros`
            : `${key}: sin actividad`,
        };
      });
      columns.push(days);
    }
    return columns;
  }, [activity]);

  const hasActivity = Boolean(activity && activity.length > 0);

  return (
    <section className="border border-outline-variant bg-surface-container-lowest p-container-padding">
      <header className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-headline-xs text-headline-xs font-bold text-primary">Actividad · últimas 12 semanas</h2>
        <div className="flex items-center gap-1.5 font-label-caps text-label-caps text-on-surface-variant">
          <span>Menos</span>
          {[0, 1, 2, 3, 4].map((level) => (
            <span aria-hidden="true" className={`h-3 w-3 rounded-[2px] ${levelClass(level)}`} key={level} />
          ))}
          <span>Más</span>
        </div>
      </header>

      {hasActivity ? (
        <div className="overflow-x-auto">
          <div className="flex min-w-0 flex-col gap-1 sm:min-w-[24rem]">
            <div className="flex gap-1 sm:gap-1.5">
              <div className="flex w-4 flex-col gap-1 sm:w-5">
                {WEEK_LABELS.map((label, index) => (
                  <span className="flex h-2.5 items-center font-data-mono text-data-mono text-[9px] text-on-surface-variant sm:h-3" key={label}>
                    {index % 2 === 0 ? label : ""}
                  </span>
                ))}
              </div>
              {grid.map((week, weekIndex) => (
                <div className="flex min-w-0 flex-1 flex-col gap-1" key={weekIndex}>
                  {week.map((day) => (
                    <span
                      aria-hidden="true"
                      className={`h-2.5 w-full rounded-[2px] sm:h-3 ${levelClass(day.level)}`}
                      key={day.date}
                      title={day.label}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <p className="font-body-sm text-body-sm text-on-surface-variant">
          Completa tareas, marca hábitos o termina pomodoros para ver tu mapa de actividad.
        </p>
      )}
    </section>
  );
}
