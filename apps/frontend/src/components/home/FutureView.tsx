"use client";

import { Inbox } from "lucide-react";
import Link from "next/link";
import { localDateKey } from "@/lib/utils";
import { minToTime } from "@/features/timeblocks/lib/time";
import type { Project, Task, TimeBlockWithProject } from "@/types/entities";

function dayLabel(offsetDays: number) {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  return new Intl.DateTimeFormat("es-CO", { weekday: "long", day: "numeric", month: "short" }).format(date);
}

function futureDayKey(offsetDays: number) {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  return localDateKey(date);
}

export function FutureView({
  tasks,
  blocks,
}: {
  tasks: (Task & { project: Project | null })[];
  blocks: TimeBlockWithProject[];
}) {
  const tomorrowKey = futureDayKey(1);
  const dayAfterKey = futureDayKey(2);

  const days = [
    { key: tomorrowKey, label: "Mañana", title: dayLabel(1) },
    { key: dayAfterKey, label: "Pasado mañana", title: dayLabel(2) },
  ];

  return (
    <section className="border border-outline-variant bg-surface-container-lowest p-container-padding">
      <header className="mb-3 flex items-center justify-between gap-2">
        <h2 className="font-headline-xs text-headline-xs font-bold text-primary">Próximos días</h2>
        <Link className="font-label-caps text-label-caps text-primary hover:underline" href="/tasks?view=week">
          IR A LA SEMANA
        </Link>
      </header>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {days.map((day) => {
          const dayTasks = tasks.filter((task) => task.dueDate && localDateKey(task.dueDate) === day.key).slice(0, 3);
          const dayBlocks = blocks.filter((block) => block.dayOfWeek === new Date(`${day.key}T12:00:00.000Z`).getDay());
          return (
            <div className="border border-outline-variant bg-surface" key={day.key}>
              <p className="border-b border-outline-variant bg-surface-bright px-3 py-2 font-label-caps text-label-caps uppercase text-on-surface-variant">
                {day.label} <span className="capitalize">{day.title}</span>
              </p>
              <div className="px-3 py-2">
                {dayBlocks.length === 0 ? (
                  <p className="font-body-sm text-body-sm text-on-surface-variant">Sin bloques</p>
                ) : (
                  <ul className="space-y-1">
                    {dayBlocks.map((block) => (
                      <li className="flex items-center gap-2 font-body-sm text-body-sm" key={block.id}>
                        <span aria-hidden="true" className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: block.project?.color ?? "#303e51" }} />
                        <span className="truncate">{block.name ?? block.project?.name ?? "Tiempo libre"}</span>
                        <span className="ml-auto shrink-0 font-data-mono text-data-mono text-xs text-on-surface-variant">
                          {minToTime(block.startMin)}–{minToTime(block.endMin)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}

                <div className="my-2 border-t border-outline-variant" />

                {dayTasks.length === 0 ? (
                  <p className="font-body-sm text-body-sm text-on-surface-variant">Sin tareas</p>
                ) : (
                  <ul className="space-y-1">
                    {dayTasks.map((task) => (
                      <li className="flex items-center gap-2 font-body-sm text-body-sm" key={task.id}>
                        {task.project && <span aria-hidden="true" className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: task.project.color }} />}
                        <Link className="line-clamp-1 min-w-0 flex-1 hover:text-primary" href={`/tasks?taskId=${encodeURIComponent(task.id)}`}>
                          {task.title}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          );
        })}
      </div>
      {tasks.length === 0 && blocks.length === 0 && (
        <p className="mt-3 flex items-center gap-2 font-body-sm text-body-sm text-on-surface-variant">
          <Inbox size={14} /> Nada programado para los próximos días.
        </p>
      )}
    </section>
  );
}
