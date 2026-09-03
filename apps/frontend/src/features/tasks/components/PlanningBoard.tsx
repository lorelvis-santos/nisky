"use client";

import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCorners,
  pointerWithin,
  useDroppable,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CalendarPlus, ChevronLeft, ChevronRight, Inbox, LoaderCircle, Plus, X } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import type { ReactNode } from "react";
import type { Task, TaskPriority, TaskSchedule } from "@/types/entities";
import { useIsMobile } from "@/hooks/useIsMobile";
import { dateKey } from "@/lib/tasks";
import { cn } from "@/lib/utils";
import { minToTime } from "@/features/timeblocks/lib/time";
import { useTaskScheduleMutations, useTaskSchedulesQuery } from "@/features/task-schedules/hooks/useTaskSchedules";
import { useUnplannedTasksQuery } from "@/features/tasks/hooks/useTasks";
import { SortableTaskCard } from "./TaskCard";
import { TaskCardGhost } from "../dnd/ghosts";

const UNPLANNED_CONTAINER = "planning:unplanned";
const DAY_PREFIX = "planning:day:";

const dayNames = ["LUN", "MAR", "MIÉ", "JUE", "VIE", "SÁB", "DOM"];

const pointerFirstCollision: CollisionDetection = (args) => {
  const pointerCollisions = pointerWithin(args);
  return pointerCollisions.length > 0 ? pointerCollisions : closestCorners(args);
};

function dayContainerId(key: string) {
  return `${DAY_PREFIX}${key}`;
}

function dayKeyFromContainerId(id: string) {
  return id.slice(DAY_PREFIX.length);
}

function addDays(start: Date, amount: number) {
  const result = new Date(start);
  result.setDate(result.getDate() + amount);
  return result;
}

function dayLabel(day: Date) {
  const index = day.getDay() === 0 ? 6 : day.getDay() - 1;
  return `${dayNames[index]} ${day.getDate()} ${day.toLocaleDateString("es-CO", { month: "short" })}`;
}

function weekLabel(start: Date) {
  const end = addDays(start, 6);
  return `${start.toLocaleDateString("es-CO", { day: "2-digit", month: "short" })} - ${end.toLocaleDateString("es-CO", { day: "2-digit", month: "short" })}`;
}

function matchesFilter(task: Task, search: string, priority: TaskPriority | "ALL") {
  if (priority !== "ALL" && task.priority !== priority) return false;
  if (!search.trim()) return true;
  const needle = search.trim().toLocaleLowerCase();
  return `${task.title} ${task.description ?? ""}`.toLocaleLowerCase().includes(needle);
}

function DropZone({ id, className, children }: { id: string; className?: string; children: ReactNode }) {
  const { isOver, setNodeRef } = useDroppable({ id });
  return (
    <div
      className={cn(className, isOver && "border-2 border-dashed border-primary bg-primary-container/10")}
      ref={setNodeRef}
    >
      {children}
    </div>
  );
}

function taskIdFromDragId(id: string) {
  return id.startsWith("task:") ? id.slice("task:".length) : "";
}

export function PlanningBoard({
  weekStart,
  selectedProjectId,
  search,
  priority,
  onOpen,
  onToggle,
  onStartPomodoro,
  onCreate,
  onCreateOnDay,
}: {
  weekStart: Date;
  selectedProjectId: string | null;
  search: string;
  priority: TaskPriority | "ALL";
  onOpen: (task: Task) => void;
  onToggle: (task: Task) => void;
  onStartPomodoro: (task: Task) => void;
  onCreate: () => void;
  onCreateOnDay: (dateKey: string) => void;
}) {
  const isMobile = useIsMobile(1023);
  const [mobileDayIndex, setMobileDayIndex] = useState(0);
  const [mobileUnplannedOpen, setMobileUnplannedOpen] = useState(false);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const days = useMemo(() => Array.from({ length: 7 }, (_, index) => addDays(weekStart, index)), [weekStart]);
  const from = dateKey(days[0]);
  const to = dateKey(days[6]);
  const schedulesQuery = useTaskSchedulesQuery({ from, to, projectId: selectedProjectId ?? undefined });
  const unplannedQuery = useUnplannedTasksQuery({
    projectId: selectedProjectId ?? undefined,
    q: search || undefined,
    priority: priority === "ALL" ? undefined : priority,
  });
  const scheduleMutations = useTaskScheduleMutations();
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 120, tolerance: 6 } }),
    useSensor(KeyboardSensor),
  );

  const schedules = useMemo(() => schedulesQuery.data ?? [], [schedulesQuery.data]);
  const unplannedTasks = useMemo(
    () => unplannedQuery.data?.pages.flatMap((page) => page.data) ?? [],
    [unplannedQuery.data],
  );
  const visibleSchedules = useMemo(
    () => schedules.filter((schedule) => matchesFilter(schedule.task, search, priority)),
    [priority, schedules, search],
  );
  const allSchedulesByDate = useMemo(() => {
    const map = new Map<string, TaskSchedule[]>();
    for (const schedule of schedules) {
      const current = map.get(schedule.date) ?? [];
      current.push(schedule);
      map.set(schedule.date, current);
    }
    for (const current of map.values()) current.sort((a, b) => a.order - b.order || a.createdAt.localeCompare(b.createdAt));
    return map;
  }, [schedules]);
  const schedulesByDate = useMemo(() => {
    const map = new Map<string, TaskSchedule[]>();
    for (const schedule of visibleSchedules) {
      const current = map.get(schedule.date) ?? [];
      current.push(schedule);
      map.set(schedule.date, current);
    }
    for (const current of map.values()) current.sort((a, b) => a.order - b.order || a.createdAt.localeCompare(b.createdAt));
    return map;
  }, [visibleSchedules]);
  const scheduleByTask = useMemo(() => new Map(schedules.map((schedule) => [schedule.taskId, schedule])), [schedules]);
  const taskById = useMemo(() => {
    const map = new Map<string, Task>();
    for (const schedule of schedules) map.set(schedule.task.id, schedule.task);
    for (const task of unplannedTasks) map.set(task.id, task);
    return map;
  }, [schedules, unplannedTasks]);
  const activeTask = activeTaskId ? taskById.get(activeTaskId) ?? null : null;
  const visibleDays = isMobile ? [days[mobileDayIndex]] : days;

  const containerForTask = (taskId: string) => {
    const schedule = scheduleByTask.get(taskId);
    return schedule ? dayContainerId(schedule.date) : UNPLANNED_CONTAINER;
  };

  const resolveContainer = (id: string) => {
    if (id === UNPLANNED_CONTAINER || id.startsWith(DAY_PREFIX)) return id;
    if (id.startsWith("task:")) return containerForTask(taskIdFromDragId(id));
    return null;
  };

  const rowsForContainer = (containerId: string) => {
    if (containerId === UNPLANNED_CONTAINER) return unplannedTasks.map((task) => task.id);
    return (allSchedulesByDate.get(dayKeyFromContainerId(containerId)) ?? []).map((schedule) => schedule.taskId);
  };

  const buildOrder = (containerId: string, taskId: string, targetIndex: number | null) => {
    const ids = rowsForContainer(containerId).filter((id) => id !== taskId);
    if (targetIndex !== null) ids.splice(Math.min(targetIndex, ids.length), 0, taskId);
    return ids;
  };

  const optimisticScheduleFor = (taskId: string, date: string, order?: number) => {
    const task = taskById.get(taskId);
    if (!task) return undefined;
    const existing = scheduleByTask.get(taskId);
    return {
      id: existing?.id ?? `optimistic:${taskId}`,
      userId: existing?.userId ?? "optimistic",
      taskId,
      date,
      timeBlockId: null,
      order: order ?? existing?.order ?? 0,
      createdAt: existing?.createdAt ?? new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      task,
      timeBlock: null,
      occurrence: null,
    } satisfies TaskSchedule;
  };

  const handleDragStart = (event: DragStartEvent) => setActiveTaskId(taskIdFromDragId(String(event.active.id)));

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveTaskId(null);
    if (!event.over) return;
    const taskId = taskIdFromDragId(String(event.active.id));
    if (!taskId) return;
    const sourceContainer = containerForTask(taskId);
    const overId = String(event.over.id);
    const targetContainer = resolveContainer(overId) ?? sourceContainer;
    const targetTaskId = overId.startsWith("task:") ? taskIdFromDragId(overId) : null;
    const targetRows = rowsForContainer(targetContainer);
    const targetIndex = targetTaskId ? Math.max(0, targetRows.indexOf(targetTaskId)) : null;

    try {
      if (sourceContainer === targetContainer) {
        if (targetContainer !== UNPLANNED_CONTAINER && targetIndex !== null) {
          await scheduleMutations.reorder.mutateAsync({
            date: dayKeyFromContainerId(targetContainer),
            items: buildOrder(targetContainer, taskId, targetIndex).map((id, order) => ({ taskId: id, order })),
          });
        }
        return;
      }

      if (targetContainer === UNPLANNED_CONTAINER) {
        await scheduleMutations.remove.mutateAsync(taskId);
        toast.success("Tarea devuelta a pendientes");
        return;
      }

      const targetDate = dayKeyFromContainerId(targetContainer);
      await scheduleMutations.save.mutateAsync({
        taskId,
        payload: { date: targetDate, timeBlockId: null, order: targetIndex ?? undefined },
        optimisticSchedule: optimisticScheduleFor(taskId, targetDate, targetIndex ?? undefined),
      });
      if (targetIndex !== null) {
        await scheduleMutations.reorder.mutateAsync({
          date: targetDate,
          items: buildOrder(targetContainer, taskId, targetIndex).map((id, order) => ({ taskId: id, order })),
        });
      }
      toast.success("Tarea planificada");
    } catch {
      toast.error("No pudimos guardar la planificación. Inténtalo de nuevo.");
    }
  };

  const loading = schedulesQuery.isLoading || unplannedQuery.isLoading;
  const failed = schedulesQuery.isError || unplannedQuery.isError;

  if (loading) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center gap-2 font-body-sm text-body-sm text-on-surface-variant">
        <LoaderCircle className="animate-spin" size={17} /> Cargando planificación...
      </div>
    );
  }

  if (failed) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center font-body-sm text-body-sm text-error">
        Ups, no pudimos cargar tu planificación. Inténtalo de nuevo.
      </div>
    );
  }

  return (
    <DndContext
      collisionDetection={pointerFirstCollision}
      onDragCancel={() => setActiveTaskId(null)}
      onDragEnd={(event) => void handleDragEnd(event)}
      onDragStart={handleDragStart}
      sensors={sensors}
    >
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto bg-surface-container-low p-3 lg:flex-row lg:overflow-hidden">
        <main className="flex min-h-0 min-w-0 flex-1 flex-col gap-2">
          {isMobile && (
            <div className="flex items-center justify-between border border-outline-variant bg-surface-container-lowest px-3 py-2">
              <button
                aria-label="Día anterior"
                className="border border-outline-variant p-1.5 text-on-surface-variant disabled:opacity-40"
                disabled={mobileDayIndex === 0}
                onClick={() => setMobileDayIndex((value) => Math.max(0, value - 1))}
                type="button"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="font-data-mono text-data-mono text-xs text-primary">{weekLabel(weekStart)} · {dayLabel(days[mobileDayIndex])}</span>
              <button
                aria-label="Día siguiente"
                className="border border-outline-variant p-1.5 text-on-surface-variant disabled:opacity-40"
                disabled={mobileDayIndex === 6}
                onClick={() => setMobileDayIndex((value) => Math.min(6, value + 1))}
                type="button"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          )}
          <div className={cn("grid min-h-0 flex-1 gap-2", isMobile ? "grid-cols-1" : "grid-cols-7")}>
            {visibleDays.map((day) => {
              const key = dateKey(day);
              const rows = schedulesByDate.get(key) ?? [];
              const isToday = key === dateKey(new Date());
              return (
                <section className="flex min-h-[360px] min-w-0 flex-col gap-2" key={key}>
                  <header className={cn("flex items-center justify-between border-b px-3 py-2", isToday ? "border-t-2 border-t-primary bg-secondary-container text-primary" : "border-outline-variant bg-surface-container-lowest")}>
                    <span className={cn("font-data-mono text-data-mono text-xs", isToday ? "font-bold" : "text-on-surface-variant")}>
                      {isToday ? "HOY · " : ""}{dayLabel(day)}
                    </span>
                    <button aria-label={`Crear tarea para ${dayLabel(day)}`} className="p-1 text-on-surface-variant hover:text-primary" onClick={() => onCreateOnDay(key)} type="button">
                      <Plus size={15} />
                    </button>
                  </header>
                  <DropZone className="flex min-h-0 flex-1 flex-col gap-3 border border-outline-variant bg-surface-container-lowest p-3" id={dayContainerId(key)}>
                    {rows.length === 0 ? (
                      <span className="flex flex-1 items-center justify-center text-center font-body-sm text-body-sm text-on-surface-variant">
                        Arrastra una tarea aquí
                      </span>
                    ) : (
                      <SortableContext items={rows.map((row) => `task:${row.taskId}`)} strategy={verticalListSortingStrategy}>
                        {rows.map((schedule) => (
                          <div className="flex flex-col gap-1" key={schedule.id}>
                            {schedule.timeBlockId && (
                              <span className="font-label-caps text-[10px] uppercase text-on-surface-variant">
                                {schedule.timeBlock?.name ?? "Bloque"}
                                {schedule.occurrence?.occurs ? ` · ${minToTime(schedule.occurrence.startMin)}` : " · Bloque no disponible"}
                              </span>
                            )}
                            <SortableTaskCard
                              onOpen={() => onOpen(schedule.task)}
                              onStartPomodoro={() => onStartPomodoro(schedule.task)}
                              onToggle={() => onToggle(schedule.task)}
                              task={schedule.task}
                            />
                          </div>
                        ))}
                      </SortableContext>
                    )}
                  </DropZone>
                </section>
              );
            })}
          </div>
        </main>
        {isMobile && (
          <button
            aria-expanded={mobileUnplannedOpen}
            className="flex items-center justify-between border border-outline-variant bg-surface-container-lowest px-3 py-2 font-label-caps text-[10px] uppercase text-primary"
            onClick={() => setMobileUnplannedOpen((open) => !open)}
            type="button"
          >
            <span>Por planificar ({unplannedTasks.length})</span>
            {mobileUnplannedOpen ? <X size={15} /> : <Inbox size={15} />}
          </button>
        )}
        <aside className={cn(
          "w-full shrink-0 flex-col border border-outline-variant bg-surface-container-lowest lg:w-80 lg:flex",
          isMobile ? (mobileUnplannedOpen ? "fixed inset-x-3 bottom-3 z-40 flex max-h-[70vh]" : "hidden") : "flex",
        )}>
          <div className="flex items-center justify-between border-b border-outline-variant p-3">
            <div>
              <h2 className="font-headline-sm text-headline-sm text-primary">Por planificar</h2>
              <p className="mt-1 font-body-sm text-body-sm text-on-surface-variant">Tareas sin día asignado</p>
            </div>
            {isMobile ? (
              <button aria-label="Cerrar tareas por planificar" className="text-on-surface-variant hover:text-primary" onClick={() => setMobileUnplannedOpen(false)} type="button">
                <X size={18} />
              </button>
            ) : <Inbox className="text-on-surface-variant" size={18} />}
          </div>
          <DropZone className="flex min-h-[180px] flex-1 flex-col gap-2 overflow-y-auto p-3" id={UNPLANNED_CONTAINER}>
            {unplannedTasks.length === 0 ? (
              <p className="flex flex-1 items-center justify-center text-center font-body-sm text-body-sm text-on-surface-variant">No hay tareas pendientes por planificar.</p>
            ) : (
              <SortableContext items={unplannedTasks.map((task) => `task:${task.id}`)} strategy={verticalListSortingStrategy}>
                {unplannedTasks.map((task) => (
                  <SortableTaskCard
                    key={task.id}
                    onOpen={() => onOpen(task)}
                    onStartPomodoro={() => onStartPomodoro(task)}
                    onToggle={() => onToggle(task)}
                    task={task}
                  />
                ))}
              </SortableContext>
            )}
            {unplannedQuery.hasNextPage && (
              <button className="flex items-center justify-center gap-1 border border-outline-variant px-3 py-2 font-label-caps text-[10px] uppercase text-primary hover:bg-primary-container/20" onClick={() => void unplannedQuery.fetchNextPage()} type="button">
                <CalendarPlus size={13} /> Cargar más
              </button>
            )}
          </DropZone>
          <button className="flex items-center justify-center gap-1 border-t border-outline-variant px-3 py-2 font-label-caps text-[10px] uppercase text-primary hover:bg-primary-container/20" onClick={onCreate} type="button">
            <Plus size={13} /> Nueva tarea
          </button>
        </aside>
      </div>
      <DragOverlay dropAnimation={null}>
        {activeTask ? <TaskCardGhost task={activeTask} /> : null}
      </DragOverlay>
    </DndContext>
  );
}
