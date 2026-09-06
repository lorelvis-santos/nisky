"use client";

import Link from "next/link";
import { CheckCircle2, MoreHorizontal, Plus, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { formatDueTime } from "@/features/tasks/lib/task-utils";
import type { Task } from "@/types/entities";
import { TaskModal, type TaskForm } from "@/features/tasks/components/TaskModal";
import { TaskPreviewModal } from "@/features/tasks/components/TaskPreviewModal";
import { useTaskMutations, useTasksQuery } from "@/features/tasks/hooks/useTasks";
import { useTaskScheduleMutations } from "@/features/task-schedules/hooks/useTaskSchedules";
import { useProjectsQuery } from "@/features/projects/hooks/useProjects";
import { useTasksSidebar } from "@/context/TasksSidebarContext";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";

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
    HIGH: "bg-warning-container text-on-warning-container",
    NORMAL: "bg-surface-container-high text-on-surface-variant",
    LOW: "bg-outline-variant text-on-surface-variant",
  };
  const priorityLabels: Record<Task["priority"], string> = {
    URGENT: "Urgente",
    HIGH: "Alta",
    NORMAL: "Normal",
    LOW: "Baja",
  };
  const projectColor = task.project?.color ?? "#666";

  return (
    <button
      className="group flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2.5 text-left transition-colors hover:bg-surface-container-low"
      onClick={onClick}
      type="button"
    >
      <span
        aria-label={task.status === "COMPLETED" ? "Desmarcar tarea" : "Completar tarea"}
         className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md border border-outline-variant transition-colors hover:bg-surface-container-high"
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
        <span className="mt-1 flex items-center gap-1.5">
           <span className={cn("rounded-md px-1.5 py-0.5 font-label-caps text-[11px]", priorityColors[task.priority])}>
            {priorityLabels[task.priority]}
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
         className="shrink-0 rounded-md p-1 text-on-surface-variant opacity-0 transition-opacity hover:bg-surface-container-low hover:text-on-surface group-hover:opacity-100"
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
  const { data: tasksData } = useTasksQuery({
    due: "UNSET",
    limit: 5,
    order: "desc",
    scheduled: "UNPLANNED",
    sort: "createdAt",
    status: ["PENDING", "IN_PROGRESS"],
  });
  const tasks = tasksData?.data ?? [];
  const total = tasksData?.meta.totalItems ?? tasks.length;

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-outline-variant p-3.5">
        <h2 className="font-headline-xs text-headline-xs">Por organizar</h2>
        <button
           className="flex items-center gap-1.5 rounded-md bg-primary-container px-3.5 py-2 font-body-sm text-body-sm text-on-primary hover:bg-primary"
          onClick={onOpenCreate}
          type="button"
        >
          <Plus size={14} />
          Nueva tarea
        </button>
      </div>

      {tasks.length === 0 ? (
        <div className="flex flex-1 items-center justify-center px-6 py-16 text-center sm:py-24">
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            No hay tareas por organizar.
          </p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          <div className="border-b border-outline-variant px-3 py-2.5">
            <p className="font-label-caps text-label-caps text-on-surface-variant">
              {total} {total === 1 ? "tarea por organizar" : "tareas por organizar"}
            </p>
          </div>
          <div className="divide-y divide-outline-variant/50">
            {tasks.map((task) => (
              <TaskItem
                key={task.id}
                onComplete={() => onComplete(task)}
                onClick={() => onOpenTask(task)}
                task={task}
              />
            ))}
          </div>
          {total > tasks.length && (
            <Link
              className="block px-3 py-3 font-label-caps text-label-caps text-secondary hover:underline"
              href="/tasks?view=backlog"
            >
              Ver todas las tareas →
            </Link>
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
  return (
    <Drawer fixed open onOpenChange={(nextOpen) => { if (!nextOpen) onClose(); }} repositionInputs>
         <DrawerContent className="flex h-[min(85dvh,42rem)] min-h-0 max-h-[85dvh] overflow-hidden border-outline-variant bg-surface pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] lg:hidden">
        <DrawerHeader className="flex shrink-0 flex-row items-center justify-between border-b border-outline-variant bg-surface-bright px-5 py-4 text-left">
          <div>
             <DrawerTitle className="font-headline-xs text-headline-xs font-bold normal-case tracking-normal text-primary">Por organizar</DrawerTitle>
             <DrawerDescription className="sr-only">Resumen de tareas pendientes por organizar.</DrawerDescription>
          </div>
          <DrawerClose asChild>
             <button aria-label="Cerrar" className="flex h-10 w-10 items-center justify-center rounded-md text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface" type="button">
              <X size={19} />
            </button>
          </DrawerClose>
        </DrawerHeader>
        <div className="min-h-0 flex-1 overflow-y-auto" data-modal-scroll>
          {children}
        </div>
      </DrawerContent>
    </Drawer>
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
  const scheduleMutations = useTaskScheduleMutations();
  const projectsQuery = useProjectsQuery();
  const projects = projectsQuery.data ?? [];
  const [modal, setModal] = useState<{ task: Task | null; creating: boolean } | null>(null);
  const [previewing, setPreviewing] = useState<Task | null>(null);

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
    const { plannedDate, scheduleChanged, ...taskForm } = form;
    const payload = {
      ...taskForm,
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
        const createdTask = await mutations.create.mutateAsync(payload);
        if (plannedDate) {
          try {
            await scheduleMutations.save.mutateAsync({
              taskId: createdTask.id,
              payload: { date: plannedDate, timeBlockId: null },
            });
          } catch {
            toast.warning("La tarea se creó, pero no pudimos planificarla.");
          }
        }
      } else if (modal?.task) {
        await mutations.update.mutateAsync({ id: modal.task.id, payload });
        if (scheduleChanged) {
          if (plannedDate) {
            await scheduleMutations.save.mutateAsync({
              taskId: modal.task.id,
              payload: { date: plannedDate, timeBlockId: null },
            });
          } else {
            await scheduleMutations.remove.mutateAsync(modal.task.id);
          }
        }
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
         onOpenCreate={() => {
           onMobileClose?.();
           setPreviewing(null);
           setModal({ task: null, creating: true });
         }}
         onOpenTask={(task) => {
           onMobileClose?.();
           setPreviewing(task);
         }}
    />
  );

  return (
    <>
      {isMobileOpen ? (
        <MobileSheet onClose={() => onMobileClose?.()}>{content}</MobileSheet>
      ) : (
        <aside
          className={cn(
             "hidden w-72 shrink-0 flex-col overflow-hidden rounded-lg border border-outline-variant bg-surface-container-lowest lg:h-full",
            isOpen ? "lg:flex" : "lg:hidden",
            className,
          )}
        >
          {content}
        </aside>
      )}
      {previewing && (
        <TaskPreviewModal
          key={previewing.id}
          onAddSubtask={async (taskId, title) => {
            await mutations.addSubtask.mutateAsync({ taskId, title });
          }}
          onClose={() => setPreviewing(null)}
          onDeleteSubtask={async (taskId, subtaskId) => {
            await mutations.removeSubtask.mutateAsync({ taskId, subtaskId });
          }}
          onEdit={() => {
            setPreviewing(null);
            setModal({ task: previewing, creating: false });
          }}
          onToggleSubtask={async (taskId, subtaskId, completed) => {
            await mutations.toggleSubtask.mutateAsync({ taskId, subtaskId, completed });
          }}
          onUpdateDescription={async (taskId, description) => {
            await mutations.update.mutateAsync({ id: taskId, payload: { description: description || null } });
          }}
          onUpdateTask={async (taskId, payload) => {
            await mutations.update.mutateAsync({ id: taskId, payload });
          }}
          onUpdateSubtask={async (taskId, subtaskId, title) => {
            await mutations.updateSubtask.mutateAsync({ taskId, subtaskId, payload: { title } });
          }}
          task={previewing}
        />
      )}
      {modal && (
        <TaskModal
          initialForm={undefined}
          key={modal.task?.id ?? "new"}
          onClose={() => setModal(null)}
          onSave={onSave}
          projects={projects}
          task={modal.task}
        />
      )}
    </>
  );
}
