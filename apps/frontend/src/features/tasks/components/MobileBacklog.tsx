"use client";

import { ChevronDown, Plus, Search } from "lucide-react";
import { useState } from "react";
import type { Task, TaskPriority } from "@/types/entities";
import { BacklogItem } from "./BacklogItem";

export function MobileBacklog({
  tasks,
  search,
  priority,
  onSearch,
  onPriority,
  onCreate,
  onOpen,
  onToggle,
  onMoveTask,
  onDragStateChange,
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
  onMoveTask: (taskId: string) => void;
  onDragStateChange: (dragging: boolean) => void;
  onStartPomodoro: (task: Task) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <aside className="shrink-0 border-t border-outline-variant bg-surface-bright">
      <div className="flex items-center justify-between px-container-padding">
        <button aria-expanded={open} className="flex flex-1 items-center justify-between py-4 text-left" onClick={() => setOpen((current) => !current)} type="button">
          <div>
            <h2 className="font-headline-sm text-headline-sm text-primary">Pendientes ({tasks.length})</h2>
            <p className="mt-1 font-body-sm text-body-sm text-on-surface-variant">Tareas sin fecha</p>
          </div>
          <ChevronDown className={`shrink-0 text-on-surface-variant transition-transform ${open ? "rotate-180" : ""}`} size={18} />
        </button>
        <button aria-label="Nueva tarea" className="ml-2 flex shrink-0 items-center justify-center bg-primary-container p-1.5 text-on-primary hover:bg-primary" onClick={onCreate} type="button">
          <Plus size={17} />
        </button>
      </div>
      {open && (
        <div className="border-t border-outline-variant">
          <div className="space-y-2 border-b border-outline-variant bg-surface-container-low p-3">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-on-surface-variant" size={15} />
              <input aria-label="Buscar tareas" className="field h-8 pl-8 text-xs" onChange={(event) => onSearch(event.target.value)} placeholder="Buscar tareas..." type="search" value={search} />
            </div>
            <select aria-label="Filtrar por prioridad" className="field h-8 text-xs" onChange={(event) => onPriority(event.target.value as TaskPriority | "ALL")} value={priority}>
              <option value="ALL">Todas las prioridades</option>
              <option value="URGENT">Urgentes</option>
              <option value="HIGH">Altas</option>
              <option value="NORMAL">Normales</option>
              <option value="LOW">Bajas</option>
            </select>
          </div>
          <div
            className="min-h-0 space-y-2 p-3"
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              const taskId = event.dataTransfer.getData("text/task-id");
              if (taskId) onMoveTask(taskId);
            }}
          >
            {tasks.length === 0 ? (
              <p className="py-8 text-center font-body-sm text-body-sm text-on-surface-variant">Todo al día. No hay tareas sin fecha.</p>
            ) : (
              tasks.map((task) => (
                <BacklogItem
                  key={task.id}
                  onDragStateChange={onDragStateChange}
                  onOpen={() => onOpen(task)}
                  onStartPomodoro={() => onStartPomodoro(task)}
                  onToggle={() => onToggle(task)}
                  task={task}
                />
              ))
            )}
          </div>
        </div>
      )}
    </aside>
  );
}
