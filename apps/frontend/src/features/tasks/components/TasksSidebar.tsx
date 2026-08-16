"use client";

import { CheckCircle2, ChevronDown, ChevronRight, MoreHorizontal, Plus, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { cn, toDatetimeLocal } from "@/lib/utils";
import { formatDueTime } from "@/features/tasks/lib/task-utils";
import type { Task } from "@/types/entities";
import { TaskModal, type TaskForm } from "@/features/tasks/components/TaskModal";
import { groupTasksByDueDate, useTaskMutations, useTodayTasksQuery } from "@/features/tasks/hooks/useTasks";
import { useProjectsQuery } from "@/features/projects/hooks/useProjects";
import { useTasksSidebar } from "@/context/TasksSidebarContext";
import { useModalScrollLock } from "@/hooks/useModalScrollLock";

interface SectionProps {
  title: string;
  count: number;
  color: "error" | "primary" | "muted";
  children: React.ReactNode;
  defaultOpen?: boolean;
}

function Section({ title, count, color, children, defaultOpen = true }: SectionProps) {
  const [open, setOpen] = useState(defaultOpen);
  const colorMap = {
    error: "text-error border-error",
    primary: "text-primary border-primary",
    muted: "text-on-surface-variant border-on-surface-variant/30",
  };

  return (
    <div className="border-b border-outline-variant">
      <button
        className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left"
        onClick={() => setOpen(!open)}
        type="button"
      >
        <span className="flex items-center gap-1.5 font-label-caps text-label-caps">
          <span className={cn("h-1.5 w-1.5 rounded-full", colorMap[color])} />
          {title}
        </span>
        <span className={cn("font-data-mono text-data-mono text-xs", colorMap[color])}>
          {count}
        </span>
        {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
      </button>
      {open && <div className="px-3 pb-2">{children}</div>}
    </div>
  );
}

function TaskItem({
  task,
  onClick,
  onComplete,
}: {
  task: Task;
  onClick: () => void;
  onComplete: () => void;
}) {
  const priorityColors: Record<Task["priority"], string> = {
    URGENT: "bg-error text-error-foreground",
    HIGH: "bg-tertiary-container text-tertiary",
    NORMAL: "bg-surface-container-high text-on-surface-variant",
    LOW: "bg-outline-variant text-on-surface-variant",
  };
  const projectColor = task.project?.color ?? "#666";

  return (
    <button
      className="group flex w-full items-center gap-2 rounded px-2 py-2 text-left transition-colors hover:bg-surface-container-low"
      onClick={onClick}
      type="button"
    >
      <span
        aria-label={task.status === "COMPLETED" ? "Desmarcar tarea" : "Completar tarea"}
        className="flex h-5 w-5 shrink-0 items-center justify-center rounded border border-outline-variant transition-colors hover:bg-surface-container-high"
        onClick={(e) => {
          e.stopPropagation();
          onComplete();
        }}
        role="button"
        tabIndex={-1}
      >
        {task.status === "COMPLETED" && <CheckCircle2 className="text-primary" size={14} />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-body-sm text-body-sm text-on-surface">{task.title}</span>
        <span className="mt-0.5 flex items-center gap-1.5">
          <span className={cn("rounded px-1.5 py-0.5 font-data-mono text-[10px]", priorityColors[task.priority])}>
            {task.priority}
          </span>
          {task.project && (
            <span
              className="rounded-full px-1.5 py-0.5 font-data-mono text-[10px] text-white"
              style={{ backgroundColor: projectColor }}
            >
              {task.project.name}
            </span>
          )}
          {task.dueDate && (
            <span className="font-data-mono text-data-mono text-xs text-on-surface-variant">
              {formatDueTime(task.dueDate)}
            </span>
          )}
        </span>
      </span>
      <span
        aria-label="Más opciones"
        className="shrink-0 p-1 text-on-surface-variant opacity-0 transition-opacity hover:text-on-surface group-hover:opacity-100"
        onClick={(e) => e.stopPropagation()}
        role="button"
        tabIndex={-1}
      >
        <MoreHorizontal size={16} />
      </span>
    </button>
  );
}

function TasksSidebarContent({
  onOpenTask,
  onComplete,
  onOpenCreate,
}: {
  onOpenTask: (task: Task) => void;
  onComplete: (task: Task) => void;
  onOpenCreate: () => void;
}) {
  const { data: tasksData } = useTodayTasksQuery();
  const tasks = tasksData?.data ?? [];
  const { overdue, todayTasks, tomorrowTasks } = groupTasksByDueDate(tasks);

  const empty =
    overdue.length === 0 && todayTasks.length === 0 && tomorrowTasks.length === 0;

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <div className="flex shrink-0 items-center justify-between border-b border-outline-variant p-3">
        <h2 className="font-headline-xs text-headline-xs">Tareas de hoy</h2>
        <button
          className="flex items-center gap-1.5 bg-primary-container px-3 py-1.5 font-body-sm text-body-sm text-on-primary hover:bg-primary"
          onClick={onOpenCreate}
          type="button"
        >
          <Plus size={14} />
          Nueva tarea
        </button>
      </div>

      {empty ? (
        <div className="flex flex-1 items-center justify-center px-6 py-16 text-center sm:py-24">
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            No hay tareas pendientes para hoy ni mañana.
          </p>
        </div>
      ) : (
        <div className="flex-1 divide-y divide-outline-variant/50 overflow-y-auto">
          {overdue.length > 0 && (
            <Section color="error" count={overdue.length} defaultOpen title="Atrasadas">
              {overdue.map((task) => (
                <TaskItem
                  key={task.id}
                  onComplete={() => onComplete(task)}
                  onClick={() => onOpenTask(task)}
                  task={task}
                />
              ))}
            </Section>
          )}
          {todayTasks.length > 0 && (
            <Section color="primary" count={todayTasks.length} defaultOpen title="Hoy">
              {todayTasks.map((task) => (
                <TaskItem
                  key={task.id}
                  onComplete={() => onComplete(task)}
                  onClick={() => onOpenTask(task)}
                  task={task}
                />
              ))}
            </Section>
          )}
          {tomorrowTasks.length > 0 && (
            <Section color="muted" count={tomorrowTasks.length} defaultOpen={false} title="Mañana">
              {tomorrowTasks.map((task) => (
                <TaskItem
                  key={task.id}
                  onComplete={() => onComplete(task)}
                  onClick={() => onOpenTask(task)}
                  task={task}
                />
              ))}
            </Section>
          )}
        </div>
      )}
    </div>
  );
}

function MobileSheet({
  children,
  onClose,
}: {
  children: React.ReactNode;
  onClose: () => void;
}) {
  useModalScrollLock();
  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-[60] flex items-end bg-on-surface/20 backdrop-blur-[1px]"
      onClick={onClose}
      role="dialog"
    >
      <div
        className="flex max-h-[85vh] w-full flex-col border border-outline-variant bg-surface"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-outline-variant bg-surface-bright px-5 py-4">
          <h2 className="font-headline-xs text-headline-xs font-bold text-primary">Tareas de hoy</h2>
          <button
            aria-label="Cerrar"
            className="text-on-surface-variant hover:text-on-surface"
            onClick={onClose}
            type="button"
          >
            <X size={19} />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto" data-modal-scroll>
          {children}
        </div>
      </div>
    </div>
  );
}

export function TasksSidebar({
  className,
  isMobileOpen = false,
  onMobileClose,
}: {
  className?: string;
  isMobileOpen?: boolean;
  onMobileClose?: () => void;
}) {
  const { isOpen } = useTasksSidebar();
  const mutations = useTaskMutations();
  const projectsQuery = useProjectsQuery();
  const projects = projectsQuery.data ?? [];
  const [modal, setModal] = useState<{ task: Task | null; creating: boolean } | null>(null);

  const handleComplete = async (task: Task) => {
    if (mutations.update.isPending) return;
    try {
      await mutations.update.mutateAsync({
        id: task.id,
        payload: { status: task.status === "COMPLETED" ? "PENDING" : "COMPLETED" },
      });
    } catch {
      toast.error("Ups, no pudimos actualizar la tarea.");
    }
  };

  const onSave = async (form: TaskForm) => {
    const payload = {
      ...form,
      description: form.description || undefined,
      dueDate: form.dueDate || undefined,
      recurrence: {
        repeatType: form.recurrence?.repeatType,
        repeatInterval: form.recurrence?.repeatInterval ?? 1,
        repeatDaysOfWeek: form.recurrence?.repeatDaysOfWeek ?? [],
        repeatDayOfMonth: form.recurrence?.repeatDayOfMonth,
        repeatEndsAt: form.recurrence?.repeatEndsAt || null,
      },
    };
    try {
      if (modal?.creating) {
        await mutations.create.mutateAsync(payload);
      } else if (modal?.task) {
        await mutations.update.mutateAsync({ id: modal.task.id, payload });
      }
      setModal(null);
      toast.success(modal?.creating ? "¡Listo, tarea creada!" : "¡Listo, tarea actualizada!");
    } catch {
      toast.error("Ups, no pudimos guardar la tarea. Inténtalo de nuevo.");
    }
  };

  const content = (
    <TasksSidebarContent
      onComplete={(task) => void handleComplete(task)}
      onOpenCreate={() => setModal({ task: null, creating: true })}
      onOpenTask={(task) => setModal({ task, creating: false })}
    />
  );

  return (
    <>
      {isMobileOpen ? (
        <MobileSheet onClose={() => onMobileClose?.()}>{content}</MobileSheet>
      ) : (
        <aside
          className={cn(
            "hidden w-72 shrink-0 flex-col border border-outline-variant bg-surface-container-lowest lg:h-full",
            isOpen ? "lg:flex" : "lg:hidden",
            className,
          )}
        >
          {content}
        </aside>
      )}
      {modal && (
        <TaskModal
          initialForm={modal.creating ? { dueDate: toDatetimeLocal(new Date()) } : undefined}
          key={modal.task?.id ?? "new"}
          onAddSubtask={async (taskId, title) => {
            await mutations.addSubtask.mutateAsync({ taskId, title });
          }}
          onClose={() => setModal(null)}
          onDeleteSubtask={async (taskId, subtaskId) => {
            await mutations.removeSubtask.mutateAsync({ taskId, subtaskId });
          }}
          onSave={onSave}
          onToggleSubtask={async (taskId, subtaskId, completed) => {
            await mutations.toggleSubtask.mutateAsync({ taskId, subtaskId, completed });
          }}
          projects={projects}
          task={modal.task}
        />
      )}
    </>
  );
}