"use client";

import { Plus, Search } from "lucide-react";
import type { Task, TaskPriority } from "@/types/entities";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { SortableBacklogItem } from "./BacklogItem";
import { DroppableColumn } from "../dnd/DroppableColumn";
import { BACKLOG_CONTAINER, taskDragId, useTasksDnd } from "../dnd/TasksDnDProvider";

export function BacklogPanel({
  tasks,
  search,
  priority,
  onSearch,
  onPriority,
  onCreate,
  onOpen,
  onToggle,
  onStartPomodoro,
}: {
  tasks: Task[];
  search: string;
  priority: TaskPriority | "ALL";
  onSearch: (value: string) => void;
  onPriority: (value: TaskPriority | "ALL") => void;
  onCreate: () => void;
  onOpen: (task: Task) => void;
  onToggle: (task: Task) => void;
  onStartPomodoro: (task: Task) => void;
}) {
  const { overContainerId } = useTasksDnd();
  const isHighlight = overContainerId === BACKLOG_CONTAINER;
  const orderedIds = tasks.map((task) => taskDragId(task.id));
  return (
    <DroppableColumn
      className="flex h-[420px] min-h-[420px] w-full shrink-0 flex-none flex-col bg-surface-bright lg:h-full lg:min-h-0 lg:w-80 lg:flex-none"
      highlightClassName="border-2 border-dashed border-primary bg-primary-container/10"
      id={BACKLOG_CONTAINER}
    >
      <div className="flex items-center justify-between border-b border-outline-variant p-container-padding">
        <div>
          <h2 className="font-headline-sm text-headline-sm text-primary">
            Pendientes
          </h2>
          <p className="mt-1 font-body-sm text-body-sm text-on-surface-variant">
            Arrastra aquí para quitar la fecha.
          </p>
        </div>
        <button
          aria-label="Nueva tarea"
          className="flex items-center justify-center bg-primary-container p-1.5 text-on-primary hover:bg-primary"
          onClick={onCreate}
          type="button"
        >
          <Plus size={17} />
        </button>
      </div>
      <div className="space-y-2 border-b border-outline-variant bg-surface-container-low p-3">
        <div className="relative">
          <Search
            className="absolute left-2 top-1/2 -translate-y-1/2 text-on-surface-variant"
            size={15}
          />
          <input
            aria-label="Buscar tareas"
            className="field h-8 pl-8 text-xs"
            onChange={(event) => onSearch(event.target.value)}
            placeholder="Buscar tareas..."
            type="search"
            value={search}
          />
        </div>
        <select
          aria-label="Filtrar por prioridad"
          className="field h-8 text-xs"
          onChange={(event) =>
            onPriority(event.target.value as TaskPriority | "ALL")
          }
          value={priority}
        >
          <option value="ALL">Todas las prioridades</option>
          <option value="URGENT">Urgentes</option>
          <option value="HIGH">Altas</option>
          <option value="NORMAL">Normales</option>
          <option value="LOW">Bajas</option>
        </select>
      </div>
      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
        {tasks.length === 0 ? (
          isHighlight ? (
            <span className="block py-8 text-center font-body-sm text-body-sm text-primary">
              Suelta aquí una tarea
            </span>
          ) : (
            <p className="py-8 text-center font-body-sm text-body-sm text-on-surface-variant">
              Todo al día. No hay tareas sin fecha.
            </p>
          )
        ) : (
          <SortableContext items={orderedIds} strategy={verticalListSortingStrategy}>
            {tasks.map((task) => (
              <SortableBacklogItem
                key={task.id}
                onOpen={() => onOpen(task)}
                onStartPomodoro={() => onStartPomodoro(task)}
                onToggle={() => onToggle(task)}
                task={task}
              />
            ))}
          </SortableContext>
        )}
      </div>
    </DroppableColumn>
  );
}
