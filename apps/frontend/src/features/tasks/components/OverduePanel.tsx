"use client";

import { AlertCircle } from "lucide-react";
import type { Task } from "@/types/entities";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { SortableBacklogItem } from "./BacklogItem";
import { DroppableColumn } from "../dnd/DroppableColumn";
import { OVERDUE_CONTAINER, taskDragId, useTasksDnd } from "../dnd/TasksDnDProvider";

export function OverduePanel({
  tasks,
  onOpen,
  onToggle,
  onStartPomodoro,
}: {
  tasks: Task[];
  onOpen: (task: Task) => void;
  onToggle: (task: Task) => void;
  onStartPomodoro: (task: Task) => void;
}) {
  const { overContainerId } = useTasksDnd();
  const isHighlight = overContainerId === OVERDUE_CONTAINER;
  const orderedIds = tasks.map((task) => taskDragId(task.id));
  return (
    <DroppableColumn
      className="flex h-[520px] min-h-[520px] w-80 shrink-0 flex-none flex-col bg-surface-bright lg:h-auto lg:min-h-0 lg:flex-none"
      highlightClassName="border-2 border-dashed border-primary bg-primary-container/10"
      id={OVERDUE_CONTAINER}
    >
      <div className="flex items-center gap-2 border-b border-outline-variant p-container-padding">
        <AlertCircle className="shrink-0 text-error" size={16} />
        <div>
          <h2 className="font-headline-sm text-headline-sm text-primary">
            Vencidas
          </h2>
          <p className="mt-1 font-body-sm text-body-sm text-on-surface-variant">
            Arrastra a un día para reprogramar.
          </p>
        </div>
      </div>
      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
        {tasks.length === 0 ? (
          isHighlight ? (
            <span className="block py-8 text-center font-body-sm text-body-sm text-primary">
              Suelta aquí una tarea
            </span>
          ) : (
            <p className="py-8 text-center font-body-sm text-body-sm text-on-surface-variant">
              Sin vencidas. ¡Todo al día!
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