import type { TaskPriority } from "@/types/entities";
import {
  taskPriorityLabels,
  taskPriorityStyles,
} from "./TaskFieldControls";

export function PriorityChip({ priority }: { priority: TaskPriority }) {
  return (
    <span
      className={`inline-flex min-h-7 shrink-0 items-center rounded-full border px-2.5 py-1 font-label-md text-label-md font-semibold leading-4 ${taskPriorityStyles[priority]}`}
    >
      {taskPriorityLabels[priority]}
    </span>
  );
}
