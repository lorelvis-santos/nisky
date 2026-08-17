"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { MoreVertical } from "lucide-react";
import type { Project, TimeBlock, CalendarEvent, TimeBlockException } from "@/types/entities";
import { cn } from "@/lib/utils";
import { DAY_NAMES_SHORT, DAY_ORDER, hexToRgba, minToTime, parseDateOnly } from "../lib/time";

const HOUR_PX = 56;
const MIN_DURATION = 15;
const EDGE = 48;
const EDGE_STEP = 24;
const MOVE_THRESHOLD = 8;

function monday(date: Date) {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  const day = result.getDay();
  result.setDate(result.getDate() - (day === 0 ? 6 : day - 1));
  return result;
}

type DayColumn = { el: HTMLElement; dayOfWeek: number };

function sameLocalDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function exceptionFor(block: TimeBlock, day: Date, exceptions: TimeBlockException[]) {
  return exceptions.find(
    (exc) => exc.blockId === block.id && sameLocalDay(parseDateOnly(exc.date), day),
  );
}

function timesOverlap(aStart: number, aEnd: number, bStart: number, bEnd: number) {
  return aStart < bEnd && aEnd > bStart;
}

function dayConflicts(block: TimeBlock, event: CalendarEvent) {
  if (event.allDay || event.startMin === null || event.endMin === null) return false;
  return timesOverlap(block.startMin, block.endMin, event.startMin, event.endMin);
}

type ResizeDraft = {
  block: TimeBlock;
  kind: "start" | "end" | "move";
  startMin: number;
  endMin: number;
  baseStartMin: number;
  baseEndMin: number;
  days: number[];
  dragDay: number;
  draggedDate: string;
  durationMin: number;
columns: DayColumn[];
   container: HTMLElement;
   grid: HTMLElement;
   left: number;
   width: number;
   headerOffset: number;
 };

export function TimeBlockWeekGrid({
  blocks,
  projects,
  events = [],
  exceptions = [],
  onBlockClick,
  onSlotClick,
  onResize,
  onResizePreview,
  onEventAction,
  moveEnabled = true,
  dayStartMin = 6 * 60,
  dayEndMin = 23 * 60,
  weekStart,
}: {
  blocks: TimeBlock[];
  projects: Project[];
  events?: CalendarEvent[];
  exceptions?: TimeBlockException[];
  onBlockClick: (block: TimeBlock, date?: Date) => void;
  onSlotClick: (dayOfWeek: number, startMin: number) => void;
  onResize: (
    block: TimeBlock,
    startMin: number,
    endMin: number,
    days: number[],
    draggedDate?: string,
  ) => void;
  onResizePreview?: (
    block: TimeBlock,
    startMin: number,
    endMin: number,
    days: number[],
  ) => void;
  onEventAction?: (event: CalendarEvent, date: Date, action: "skip" | "move") => void;
  moveEnabled?: boolean;
  dayStartMin?: number;
  dayEndMin?: number;
  weekStart?: Date;
}) {
  const totalMin = Math.max(dayEndMin - dayStartMin, 60);
  const totalPx = (totalMin * HOUR_PX) / 60;
  const scrollRef = useRef<HTMLDivElement>(null);
  const [draft, setDraft] = useState<ResizeDraft | null>(null);
  const draftRef = useRef<ResizeDraft | null>(null);
  const [eventMenu, setEventMenu] = useState<{ eventId: string; date: Date } | null>(null);

  useEffect(() => {
    if (!eventMenu) return;
    const close = () => setEventMenu(null);
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [eventMenu]);
  const downRef = useRef<{ x: number; y: number } | null>(null);
  const movedRef = useRef(false);
  const blockDownRef = useRef(false);
  const pointerPosRef = useRef<{ x: number; y: number } | null>(null);
  const rafRef = useRef<number | null>(null);
  const onResizeRef = useRef(onResize);
  const onResizePreviewRef = useRef(onResizePreview);
  const onBlockClickRef = useRef(onBlockClick);
  useEffect(() => {
    onResizeRef.current = onResize;
    onResizePreviewRef.current = onResizePreview;
    onBlockClickRef.current = onBlockClick;
  });
  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const todayKey = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`;
  const gridWeekStart = weekStart ?? monday(now);
  const days = DAY_ORDER.map((dayOfWeek, index) => {
    const date = new Date(gridWeekStart);
    date.setDate(date.getDate() + index);
    return {
      dayOfWeek,
      date,
      key: `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`,
    };
  });
  const hourMarks = Array.from(
    { length: Math.floor((dayEndMin - dayStartMin) / 60) },
    (_, index) => dayStartMin + (index + 1) * 60,
  );

  const [initialScrollTop] = useState(() =>
    Math.max(((nowMin - (dayStartMin + 4 * 60)) * HOUR_PX) / 60, 0),
  );

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = initialScrollTop;
    const todayColumn = el.querySelector<HTMLElement>("[data-today='true']");
    if (!todayColumn) return;
    const containerRect = el.getBoundingClientRect();
    const columnRect = todayColumn.getBoundingClientRect();
    const maxScroll = Math.max(el.scrollWidth - el.clientWidth, 0);
    const target =
      el.scrollLeft +
      (columnRect.left - containerRect.left) -
      (el.clientWidth - columnRect.width) / 2;
    el.scrollLeft = Math.min(Math.max(target, 0), maxScroll);
  }, [initialScrollTop]);

  const clickSlot = (
    event: React.MouseEvent<HTMLDivElement>,
    dayOfWeek: number,
  ) => {
    if (blockDownRef.current) return;
    if (event.target !== event.currentTarget) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const minute = dayStartMin + ((event.clientY - rect.top) / HOUR_PX) * 60;
    onSlotClick(dayOfWeek, Math.round(minute / 15) * 15);
  };

  const getColumns = (grid: HTMLElement): DayColumn[] =>
    Array.from(grid.querySelectorAll<HTMLElement>("[data-resize-col]")).map(
      (el) => ({
        el,
        dayOfWeek: Number(el.getAttribute("data-day")),
      }),
    );

  const stopAutoscroll = useCallback(() => {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  const scrollTick = useCallback(() => {
    rafRef.current = null;
    const state = draftRef.current;
    const pos = pointerPosRef.current;
    if (!state || !pos) return;
    const vh = window.innerHeight;
    const vw = window.innerWidth;
    const rect = state.container.getBoundingClientRect();
    const speed = (overshoot: number) =>
      Math.min(EDGE_STEP + Math.abs(overshoot) * 2, 80);
    const overTop = Math.max(rect.top + EDGE - pos.y, EDGE - pos.y);
    const overBottom = Math.max(
      pos.y - (rect.bottom - EDGE),
      pos.y - (vh - EDGE),
    );
    const overLeft = Math.max(rect.left + EDGE - pos.x, EDGE - pos.x);
    const overRight = Math.max(
      pos.x - (rect.right - EDGE),
      pos.x - (vw - EDGE),
    );
    let dx = 0;
    let dy = 0;
    if (overTop > 0) dy = -speed(overTop);
    else if (overBottom > 0) dy = speed(overBottom);
    if (overLeft > 0) dx = -speed(overLeft);
    else if (overRight > 0) dx = speed(overRight);
    if (dx !== 0 || dy !== 0) {
      state.container.scrollTop += dy;
      state.container.scrollLeft += dx;
    }
    rafRef.current = requestAnimationFrame(scrollTick);
  }, []);

  const moveHandle = useCallback(
    (event: PointerEvent) => {
      const state = draftRef.current;
      if (!state) return;
      const down = downRef.current;
      if (!movedRef.current && down) {
        const dx = event.clientX - down.x;
        const dy = event.clientY - down.y;
        if (Math.abs(dx) > MOVE_THRESHOLD || Math.abs(dy) > MOVE_THRESHOLD) {
          movedRef.current = true;
          rafRef.current = requestAnimationFrame(scrollTick);
        }
      }
      if (!movedRef.current) return;
      event.preventDefault();
      pointerPosRef.current = { x: event.clientX, y: event.clientY };

      let colRect: DOMRect | null = null;
      let dragDay = state.dragDay;
      if (state.kind === "move") {
        const first = state.columns[0]?.el.getBoundingClientRect();
        const last =
          state.columns[state.columns.length - 1]?.el.getBoundingClientRect();
        if (first && last) {
          const colWidth = (last.right - first.left) / state.columns.length;
          const index = Math.min(
            Math.max(Math.floor((event.clientX - first.left) / colWidth), 0),
            state.columns.length - 1,
          );
          const column = state.columns[index];
          dragDay = column.dayOfWeek;
          colRect = column.el.getBoundingClientRect();
        }
      } else {
        const own = state.columns.find(
          (column) => column.dayOfWeek === dragDay,
        );
        if (own) colRect = own.el.getBoundingClientRect();
      }
      if (!colRect) return;
      const minute =
        Math.round(
          (dayStartMin + ((event.clientY - colRect.top) / HOUR_PX) * 60) / 15,
        ) * 15;
      const clamped = Math.min(Math.max(minute, dayStartMin), dayEndMin);
      const next = { ...state };
      if (state.kind === "move") {
        next.startMin = Math.min(
          Math.max(clamped, dayStartMin),
          dayEndMin - state.durationMin,
        );
        next.endMin = next.startMin + state.durationMin;
        next.days = state.block.daysOfWeek.map(
          (day) => (day - state.dragDay + dragDay + 7) % 7,
        );
        next.left = colRect.left - state.grid.getBoundingClientRect().left + 4;
        next.width = colRect.width - 8;
      } else if (state.kind === "start") {
        next.startMin = Math.min(clamped, state.endMin - MIN_DURATION);
      } else {
        next.endMin = Math.max(clamped, state.startMin + MIN_DURATION);
      }
      draftRef.current = next;
      setDraft(next);
      onResizePreviewRef.current?.(
        next.block,
        next.startMin,
        next.endMin,
        next.days,
      );
    },
    [dayStartMin, dayEndMin, scrollTick],
  );

  const endResize = useCallback(
    function endResize() {
      stopAutoscroll();
      pointerPosRef.current = null;
      const state = draftRef.current;
      draftRef.current = null;
      downRef.current = null;
      setDraft(null);
      window.removeEventListener("pointermove", moveHandle);
      window.removeEventListener("pointerup", endResize);
      window.removeEventListener("pointercancel", endResize);
      if (!state) return;
      const daysChanged =
        state.days.length !== state.block.daysOfWeek.length ||
        state.days.some((day, index) => day !== state.block.daysOfWeek[index]);
      const changed =
        state.startMin !== state.baseStartMin ||
        state.endMin !== state.baseEndMin ||
        daysChanged;
      if (changed) {
        onResizeRef.current(
          state.block,
          state.startMin,
          state.endMin,
          state.days,
          state.draggedDate
        );
      } else if (!movedRef.current) {
        onBlockClickRef.current(state.block);
      }
    },
    [moveHandle, stopAutoscroll],
  );

  const attachWindowListeners = useCallback(() => {
    window.addEventListener("pointermove", moveHandle);
    window.addEventListener("pointerup", endResize);
    window.addEventListener("pointercancel", endResize);
  }, [moveHandle, endResize]);

  const startResize = (
    event: React.PointerEvent<HTMLDivElement>,
    block: TimeBlock,
    edge: "start" | "end",
  ) => {
    event.preventDefault();
    event.stopPropagation();
    const grid = event.currentTarget.closest<HTMLElement>("[data-grid]");
    const container = scrollRef.current;
    if (!grid || !container) return;
    const columns = getColumns(grid);
    const column =
      event.currentTarget.closest<HTMLElement>("[data-resize-col]");
    const dragDay = column
      ? Number(column.getAttribute("data-day"))
      : block.daysOfWeek[0];
    const ownColumn = columns.find((item) => item.dayOfWeek === dragDay);
    const gridRect = grid.getBoundingClientRect();
    const colRect = ownColumn?.el.getBoundingClientRect();
    const dragDateObj = days.find((d) => d.dayOfWeek === dragDay)?.date;
    const draggedDate = dragDateObj 
      ? `${dragDateObj.getFullYear()}-${String(dragDateObj.getMonth() + 1).padStart(2, "0")}-${String(dragDateObj.getDate()).padStart(2, "0")}`
      : "";
    const dragException = dragDateObj
      ? exceptionFor(block, dragDateObj, exceptions)
      : undefined;
    const baseStartMin =
      dragException?.action === "move" && dragException.startMin !== null
        ? dragException.startMin
        : block.startMin;
    const baseEndMin =
      dragException?.action === "move" && dragException.endMin !== null
        ? dragException.endMin
        : block.endMin;
    blockDownRef.current = true;
    downRef.current = { x: event.clientX, y: event.clientY };
    movedRef.current = false;
    pointerPosRef.current = { x: event.clientX, y: event.clientY };
    draftRef.current = {
      block,
      kind: edge,
      startMin: baseStartMin,
      endMin: baseEndMin,
      baseStartMin,
      baseEndMin,
      days: [...block.daysOfWeek],
      dragDay,
      draggedDate,
      durationMin: baseEndMin - baseStartMin,
      columns,
      container,
      grid,
      left: colRect ? colRect.left - gridRect.left + 4 : 0,
      width: colRect ? colRect.width - 8 : 0,
      headerOffset: colRect ? colRect.top - gridRect.top : 0,
    };
    setDraft(draftRef.current);
    attachWindowListeners();
  };

  const startMove = (
    event: React.PointerEvent<HTMLButtonElement>,
    block: TimeBlock,
  ) => {
    event.preventDefault();
    event.stopPropagation();
    if (!moveEnabled) return;
    const grid = event.currentTarget.closest<HTMLElement>("[data-grid]");
    const column =
      event.currentTarget.closest<HTMLElement>("[data-resize-col]");
    const container = scrollRef.current;
    if (!grid || !column || !container) return;
    const dragDay = Number(column.getAttribute("data-day"));
    const columns = getColumns(grid);
    const gridRect = grid.getBoundingClientRect();
    const colRect = column.getBoundingClientRect();
    const dragDateObj = days.find((d) => d.dayOfWeek === dragDay)?.date;
    const draggedDate = dragDateObj 
      ? `${dragDateObj.getFullYear()}-${String(dragDateObj.getMonth() + 1).padStart(2, "0")}-${String(dragDateObj.getDate()).padStart(2, "0")}`
      : "";
    const dragException = dragDateObj
      ? exceptionFor(block, dragDateObj, exceptions)
      : undefined;
    const baseStartMin =
      dragException?.action === "move" && dragException.startMin !== null
        ? dragException.startMin
        : block.startMin;
    const baseEndMin =
      dragException?.action === "move" && dragException.endMin !== null
        ? dragException.endMin
        : block.endMin;
    blockDownRef.current = true;
    downRef.current = { x: event.clientX, y: event.clientY };
    movedRef.current = false;
    pointerPosRef.current = { x: event.clientX, y: event.clientY };
    draftRef.current = {
      block,
      kind: "move",
      startMin: baseStartMin,
      endMin: baseEndMin,
      baseStartMin,
      baseEndMin,
      days: [...block.daysOfWeek],
      dragDay,
      draggedDate,
      durationMin: baseEndMin - baseStartMin,
      columns,
      container,
      grid,
      left: colRect.left - gridRect.left + 4,
      width: colRect.width - 8,
      headerOffset: colRect.top - gridRect.top,
    };
    setDraft(draftRef.current);
    attachWindowListeners();
  };

  const renderBlockButton = (
    block: TimeBlock,
    startMin: number,
    endMin: number,
    hidden: boolean,
    conflict?: CalendarEvent,
    dayDate?: Date,
  ) => {
    const project = projects.find((item) => item.id === block.projectId);
    const color = project?.color ?? "#7a8494";
    const label = block.name ?? project?.name ?? "Tiempo libre";
    const top = (Math.max(startMin - dayStartMin, 0) * HOUR_PX) / 60;
    const bottom = (Math.min(endMin - dayStartMin, totalMin) * HOUR_PX) / 60;
    const height = Math.max(bottom - top, 12);
    const compact = height < 48;
    return (
      <button
        aria-label={
          hidden
            ? undefined
            : `${label}: ${minToTime(startMin)} a ${minToTime(endMin)}`
        }
        aria-hidden={hidden ? true : undefined}
        className={cn(
          "absolute inset-x-1 z-10 border-l-2 px-2 py-1 text-left",
          moveEnabled
            ? "cursor-grab touch-none active:cursor-grabbing"
            : "cursor-pointer",
          block.isActive ? "" : "opacity-40",
          hidden && "opacity-0",
        )}
        key={block.id}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          if (!moveEnabled || event.detail === 0) onBlockClick(block, dayDate);
        }}
        onPointerDown={
          moveEnabled ? (event) => startMove(event, block) : undefined
        }
        style={{
          top,
          height,
          backgroundColor: hexToRgba(color, 0.14),
          borderColor: color,
          ...(conflict ? { outline: "1px dashed var(--error)", outlineOffset: -3 } : {}),
        }}
        title={
          conflict
            ? `${label} · ${minToTime(startMin)}–${minToTime(endMin)} · ¡Choca con "${conflict.title}"!`
            : `${label} · ${minToTime(startMin)}–${minToTime(endMin)}${block.isActive ? "" : " · Pausado"}`
        }
        type="button"
      >
        {conflict && (
          <span
            aria-hidden="true"
            className="absolute right-1 top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-error text-[10px] font-bold text-on-primary"
            title={`Choca con "${conflict.title}"`}
          >
            !
          </span>
        )}
        <p
          className={cn(
            "truncate font-body-sm text-body-sm font-semibold",
            compact && "leading-tight",
          )}
          style={{ color }}
        >
          {label}
        </p>
        {!compact && (
          <p className="truncate font-data-mono text-data-mono text-[10px] text-on-surface-variant">
            {minToTime(startMin)}–{minToTime(endMin)}
          </p>
        )}
        <div
          aria-hidden="true"
          className="absolute inset-x-0 top-0 z-20 h-4 cursor-ns-resize touch-none lg:h-2"
          onPointerDown={(event) => startResize(event, block, "start")}
          title="Arrastra para cambiar el inicio"
        />
        <div
          aria-hidden="true"
          className="absolute inset-x-0 bottom-0 z-20 h-4 cursor-ns-resize touch-none lg:h-2"
          onPointerDown={(event) => startResize(event, block, "end")}
          title="Arrastra para cambiar el fin"
        />
      </button>
    );
  };

  const renderEventBlock = (event: CalendarEvent, conflict?: TimeBlock, dayDate?: Date) => {
    if (event.allDay || event.startMin === null || event.endMin === null) return null;
    const eventColor = event.color ?? "#303e51";
    const top = (Math.max(event.startMin - dayStartMin, 0) * HOUR_PX) / 60;
    const bottom = (Math.min(event.endMin - dayStartMin, totalMin) * HOUR_PX) / 60;
    const height = Math.max(bottom - top, 12);
    const menuOpen = eventMenu?.eventId === event.id;
    return (
      <div
        key={event.id}
        className={cn(
          "absolute inset-x-1 z-0 overflow-hidden border-l-2 px-2 py-1 text-left",
          conflict && "border-l-error",
        )}
        style={{
          top,
          height,
          backgroundColor: hexToRgba(eventColor, 0.14),
          borderColor: conflict ? "var(--error)" : eventColor,
          ...(conflict ? { outline: "1px dashed var(--error)", outlineOffset: -3 } : {}),
        }}
        title={conflict ? `${event.title} · ¡Choca con el bloque "${conflict.name ?? projects.find((p) => p.id === conflict.projectId)?.name ?? "Tiempo libre"}"!` : undefined}
      >
        <p className="truncate font-body-sm text-body-sm font-semibold leading-tight" style={{ color: eventColor }}>
          {event.title}
        </p>
        {event.location && (
          <p className="truncate font-data-mono text-[10px] text-on-surface-variant/60 leading-tight">
            ⌖ {event.location}
          </p>
        )}
        {event.recurrenceType && dayDate && onEventAction && (
          <div
            className="absolute right-1 top-1 z-30"
            onPointerDown={(e) => e.stopPropagation()}
          >
            <button
              aria-label="Opciones del evento recurrente"
              className="flex h-5 w-5 items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-container-high"
              onClick={(e) => {
                e.stopPropagation();
                setEventMenu((m) => (m?.eventId === event.id ? null : { eventId: event.id, date: dayDate }));
              }}
              type="button"
            >
              <MoreVertical size={12} />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-6 z-40 flex w-40 flex-col border border-outline-variant bg-surface-container-lowest">
                <button
                  className="px-3 py-2 text-left font-body-sm text-body-sm text-on-surface hover:bg-surface-container-high"
                  onClick={(e) => {
                    e.stopPropagation();
                    setEventMenu(null);
                    onEventAction(event, dayDate, "skip");
                  }}
                  type="button"
                >
                  Saltar solo hoy
                </button>
                <button
                  className="border-t border-outline-variant px-3 py-2 text-left font-body-sm text-body-sm text-on-surface hover:bg-surface-container-high"
                  onClick={(e) => {
                    e.stopPropagation();
                    setEventMenu(null);
                    onEventAction(event, dayDate, "move");
                  }}
                  type="button"
                >
                  Mover solo hoy
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const draftProject = draft
    ? projects.find((item) => item.id === draft.block.projectId)
    : null;
  const draftColor = draftProject?.color ?? "#7a8494";
  const draftLabel = draft
    ? (draft.block.name ?? draftProject?.name ?? "Tiempo libre")
    : "";
  const draftTop = draft
    ? draft.headerOffset + (Math.max(draft.startMin - dayStartMin, 0) * HOUR_PX) / 60
    : 0;
  const draftBottom = draft
    ? draft.headerOffset + (Math.min(draft.endMin - dayStartMin, totalMin) * HOUR_PX) / 60
    : 0;

  return (
    <div className={cn("flex min-w-0 flex-col", draft && "select-none")}>
      <div
        ref={scrollRef}
        className="max-h-[calc(100dvh-16rem)] overflow-auto bg-surface-container-low lg:max-h-[calc(100vh-15rem)]"
      >
        <div className="min-w-[820px] pb-3 pr-3">
          <div
            data-grid
            className="relative grid grid-cols-[3rem_repeat(7,minmax(110px,1fr))]"
          >
            <div
              aria-hidden="true"
              className="sticky left-0 top-0 z-40 border-r border-b border-outline-variant bg-surface-container-low"
            />
            {days.map((day) => (
              <div
                className={cn(
                  "sticky top-0 z-20 border-b bg-surface-container-low px-2 py-2 text-center",
                  day.key === todayKey
                    ? "border-t-2 border-t-primary text-primary"
                    : "border-t border-t-outline-variant text-on-surface-variant",
                )}
                key={day.key}
              >
                <span
                  className={cn(
                    "flex flex-col items-center py-1",
                    day.key === todayKey && "bg-secondary-container/40",
                  )}
                >
                  <p className="font-data-mono text-data-mono text-xs font-semibold">
                    {DAY_NAMES_SHORT[day.dayOfWeek]}
                  </p>
                  <p className="mt-0.5 font-data-mono text-data-mono text-xs">
                    {day.date.getDate()}
                  </p>
                </span>
                <div className="mt-1 flex flex-col gap-1">
                  {events
                    .filter((e) => e.allDay && sameLocalDay(parseDateOnly(e.date), day.date))
                    .map((e) => (
                      <div key={e.id} className="truncate rounded-sm bg-surface-container-high px-1 text-[10px] font-medium text-on-surface" title={e.title}>
                        {e.title}
                      </div>
                    ))}
                </div>
              </div>
            ))}
            <div
              className="sticky left-0 z-20 border-r border-outline-variant bg-surface-container-low"
              style={{ height: totalPx }}
            >
              {hourMarks.map((hour) => (
                <span
                  className="absolute right-2 -translate-y-1/2 font-data-mono text-data-mono text-[11px] text-on-surface-variant"
                  key={hour}
                  style={{ top: ((hour - dayStartMin) * HOUR_PX) / 60 }}
                >
                  {minToTime(hour)}
                </span>
              ))}
            </div>
            {days.map((day) => {
              const dayBlocks = blocks
                .filter((block) => block.daysOfWeek.includes(day.dayOfWeek))
                .sort((a, b) => a.startMin - b.startMin);
              const dayEvents = events.filter(
                (e) => sameLocalDay(parseDateOnly(e.date), day.date),
              );
              const isToday = day.key === todayKey;
              return (
                <div
                  className={cn(
                    "relative cursor-pointer border-l border-outline-variant transition-colors hover:bg-surface-container-high/40",
                    isToday && "bg-secondary-container/15",
                  )}
                  data-day={day.dayOfWeek}
                  data-resize-col
                  data-today={isToday ? "true" : undefined}
                  key={day.key}
                  onClick={(event) => clickSlot(event, day.dayOfWeek)}
                  onPointerDown={() => {
                    blockDownRef.current = false;
                  }}
                  style={{ height: totalPx }}
                >
                  {dayBlocks.map((block) => {
                    const exc = exceptionFor(block, day.date, exceptions);
                    if (exc?.action === "skip") return null;
                    const startMin = exc?.action === "move" && exc.startMin !== null ? exc.startMin : block.startMin;
                    const endMin = exc?.action === "move" && exc.endMin !== null ? exc.endMin : block.endMin;
                    const conflict = dayEvents.find(
                      (event) => dayConflicts({ ...block, startMin, endMin }, event),
                    );
                    const hidden =
                      draft?.block.id === block.id && draft.dragDay === day.dayOfWeek;
                    return renderBlockButton(
                      block,
                      startMin,
                      endMin,
                      hidden,
                      conflict,
                      day.date,
                    );
                  })}
                  {dayEvents
                    .filter((e) => !e.allDay && e.startMin !== null && e.endMin !== null)
                    .map((e) => {
                      const conflict = dayBlocks.find((block) => {
                        const exc = exceptionFor(block, day.date, exceptions);
                        if (exc?.action === "skip") return false;
                        const bStart = exc?.action === "move" && exc.startMin !== null ? exc.startMin : block.startMin;
                        const bEnd = exc?.action === "move" && exc.endMin !== null ? exc.endMin : block.endMin;
                        return dayConflicts({ ...block, startMin: bStart, endMin: bEnd }, e);
                      });
                      return renderEventBlock(e, conflict, day.date);
                    })}
                  {isToday && nowMin >= dayStartMin && nowMin <= dayEndMin && (
                    <div
                      className="pointer-events-none absolute inset-x-0 z-[15]"
                      style={{ top: ((nowMin - dayStartMin) * HOUR_PX) / 60 }}
                    >
                      <div className="absolute -left-[3px] -top-[3px] h-[7px] w-[7px] rounded-full bg-error" />
                      <div className="h-px w-full bg-error" />
                    </div>
                  )}
                </div>
              );
            })}
            {draft && (
              <div
                aria-hidden="true"
                className="pointer-events-none absolute z-30 border-l-2 px-2 py-1"
                style={{
                  left: draft.left,
                  width: draft.width,
                  top: draftTop,
                  height: Math.max(draftBottom - draftTop, 12),
                  backgroundColor: hexToRgba(draftColor, 0.3),
                  borderColor: draftColor,
                }}
              >
                <p
                  className="truncate font-body-sm text-body-sm font-semibold"
                  style={{ color: draftColor }}
                >
                  {draftLabel}
                </p>
                <p className="truncate font-data-mono text-data-mono text-[10px] text-on-surface-variant">
                  {minToTime(draft.startMin)}–{minToTime(draft.endMin)}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
