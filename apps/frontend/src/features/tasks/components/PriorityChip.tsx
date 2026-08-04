import type { TaskPriority } from "@/types/entities";

const labels: Record<TaskPriority, string> = {
  URGENT: "Urgente",
  HIGH: "Alta",
  NORMAL: "Normal",
  LOW: "Baja",
};

export function PriorityChip({ priority }: { priority: TaskPriority }) {
  const styles: Record<TaskPriority, string> = {
    URGENT: "border-error bg-error-container text-on-error-container",
    HIGH: "border-tertiary-fixed-dim bg-tertiary-fixed text-on-tertiary-fixed",
    NORMAL:
      "border-secondary-container bg-secondary-container text-on-secondary-container",
    LOW: "border-outline-variant bg-surface-container-high text-on-surface-variant",
  };
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full border px-1.5 py-0.5 font-label-caps text-[11px] leading-4 ${styles[priority]}`}
    >
      {labels[priority]}
    </span>
  );
}
