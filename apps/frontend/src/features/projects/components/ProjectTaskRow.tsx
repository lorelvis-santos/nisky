"use client";

import {
  CheckCircle2,
  Circle,
  MoreHorizontal,
  Play,
  X,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useIsMobile } from "@/hooks/useIsMobile";
import {
  TaskAssigneeSelect,
  TaskDueDateEditor,
  TaskPrioritySelect,
  TaskStatusSelect,
  datetimeWithDate,
  datetimeWithTime,
  type TaskAssigneeOption,
} from "@/features/tasks/components/TaskFieldControls";
import type { TaskUpdatePayload } from "@/features/tasks/api/tasks";
import type { ProjectMember, Task } from "@/types/entities";
import { cn, isTaskOverdue, localDateKey, toDatetimeLocal } from "@/lib/utils";
import { formatTaskDueDate } from "@/features/tasks/lib/task-utils";

type TaskRowOverrides = Partial<
  Pick<Task, "status" | "priority" | "dueDate" | "assigneeId">
>;
type EditableTaskField = keyof TaskRowOverrides;

export function ProjectTaskRow({
  task,
  members,
  canEditTasks,
  onOpen,
  onToggle,
  onStartPomodoro,
  onUpdateTask,
  isPreviewed,
}: {
  task: Task;
  members: ProjectMember[];
  canEditTasks: boolean;
  onOpen: () => void;
  onToggle: (task: Task) => void;
  onStartPomodoro: () => void;
  onUpdateTask: (taskId: string, payload: TaskUpdatePayload) => Promise<void>;
  isPreviewed?: boolean;
}) {
  const [overrides, setOverrides] = useState<TaskRowOverrides>({});
  const [pendingField, setPendingField] =
    useState<EditableTaskField | null>(null);

  const displayDueDate = Object.prototype.hasOwnProperty.call(
    overrides,
    "dueDate",
  )
    ? (overrides.dueDate ?? null)
    : task.dueDate;
  const displayAssigneeId = Object.prototype.hasOwnProperty.call(
    overrides,
    "assigneeId",
  )
    ? (overrides.assigneeId ?? null)
    : task.assigneeId;
  const displayTask: Task = {
    ...task,
    status: overrides.status ?? task.status,
    priority: overrides.priority ?? task.priority,
    dueDate: displayDueDate,
    assigneeId: displayAssigneeId,
  };
  const completed = displayTask.status === "COMPLETED";
  const assigneeOptions: TaskAssigneeOption[] = members.map((member) => ({
    avatarUrl: member.user.avatarUrl,
    email: member.user.email,
    id: member.userId,
    label: member.user.name ?? member.user.email,
    name: member.user.name,
  }));
  if (
    task.assignee &&
    !assigneeOptions.some((member) => member.id === task.assignee?.id)
  ) {
    assigneeOptions.push({
      avatarUrl: task.assignee.avatarUrl,
      email: task.assignee.email,
      id: task.assignee.id,
      label: task.assignee.name ?? task.assignee.email,
      name: task.assignee.name,
    });
  }

  const updateField = async (
    field: EditableTaskField,
    payload: TaskUpdatePayload,
    optimistic: TaskRowOverrides,
    errorMessage: string,
  ) => {
    if (pendingField) return false;
    const fields = Object.keys(optimistic) as EditableTaskField[];
    setPendingField(field);
    setOverrides((previous) => ({ ...previous, ...optimistic }));
    try {
      await onUpdateTask(task.id, payload);
      setOverrides((previous) => {
        const next = { ...previous };
        for (const key of fields) delete next[key];
        return next;
      });
      return true;
    } catch {
      setOverrides((previous) => {
        const next = { ...previous };
        for (const key of fields) delete next[key];
        return next;
      });
      toast.error(errorMessage);
      return false;
    } finally {
      setPendingField(null);
    }
  };

  const updateStatus = (status: Task["status"]) => {
    if (status === displayTask.status) return;
    void updateField(
      "status",
      { status },
      { status },
      "No pudimos actualizar el estado.",
    );
  };

  const updatePriority = (priority: Task["priority"]) => {
    if (priority === displayTask.priority) return;
    void updateField(
      "priority",
      { priority },
      { priority },
      "No pudimos actualizar la prioridad.",
    );
  };

  const updateAssignee = (assigneeId: string | null) => {
    if (assigneeId === displayTask.assigneeId) return;
    void updateField(
      "assigneeId",
      { assigneeId },
      { assigneeId },
      "No pudimos actualizar el responsable.",
    );
  };

  const updateDueDate = (dueDate: string | null) => {
    if (displayTask.recurrenceType && !dueDate) {
      toast.error("Una tarea recurrente necesita fecha de vencimiento.");
      return Promise.resolve(false);
    }
    return updateField(
      "dueDate",
      { dueDate },
      { dueDate },
      "No pudimos actualizar el vencimiento.",
    );
  };

  return (
    <article
      aria-current={isPreviewed ? "true" : undefined}
      className={cn(
        "grid min-w-0 max-w-full grid-cols-[44px_minmax(0,1fr)] gap-2 px-2 py-2 transition-colors hover:bg-[#fafaf8] sm:px-3 md:grid-cols-[44px_minmax(0,1fr)_7.25rem_6.5rem_7.5rem_7rem_2.75rem] md:items-center lg:px-4",
        completed && "bg-[#fdfdfb]",
        isPreviewed && "bg-[#f0f5ff] ring-1 ring-inset ring-[#3b82f6]",
      )}
    >
      <button
        aria-label={
          completed
            ? "Marcar tarea como pendiente"
            : "Marcar tarea como completada"
        }
        className="flex h-11 w-11 items-center justify-center rounded-full text-[#9aa2a5] hover:bg-[#e7e9e8] hover:text-[#1e3a5f] disabled:cursor-wait disabled:opacity-50"
        disabled={!canEditTasks || pendingField !== null}
        onClick={() => onToggle(displayTask)}
        type="button"
      >
        {completed ? (
          <CheckCircle2 className="text-[#4a7c59]" size={20} />
        ) : (
          <Circle size={20} />
        )}
      </button>

      <div className="flex min-w-0 items-start gap-2 md:hidden">
        <div className="min-w-0 flex-1">
          <button
            className="block w-full min-w-0 max-w-full overflow-hidden rounded-md text-left"
            onClick={onOpen}
            type="button"
          >
            <span
              className={cn(
                "block truncate text-[13px] font-medium text-[#2f3b45]",
                completed && "text-[#858d91] line-through",
              )}
            >
              {task.title}
            </span>
          </button>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-[#858d91]">
            <TaskStatusSelect
              ariaLabel={`Cambiar estado de ${task.title}`}
              className="h-6 w-fit max-w-full px-2 text-[10px]"
              disabled={!canEditTasks || pendingField !== null}
              onChange={updateStatus}
              value={displayTask.status}
            />
            <TaskPrioritySelect
              ariaLabel={`Cambiar prioridad de ${task.title}`}
              className="h-6 w-fit max-w-full px-2 text-[10px]"
              disabled={!canEditTasks || pendingField !== null}
              onChange={updatePriority}
              value={displayTask.priority}
            />
            <TaskDueDateCell
              disabled={!canEditTasks || pendingField !== null}
              onChange={updateDueDate}
              pending={pendingField === "dueDate"}
              status={displayTask.status}
              title={task.title}
              value={displayDueDate}
            />
            <TaskAssigneeSelect
              ariaLabel={`Cambiar responsable de ${task.title}`}
              className="max-w-[10rem] text-left text-[11px]"
              disabled={
                !canEditTasks || pendingField !== null || members.length === 0
              }
              onChange={updateAssignee}
              options={assigneeOptions}
              value={displayAssigneeId}
            />
          </div>
        </div>
        <TaskRowActions
          onOpen={onOpen}
          onStartPomodoro={onStartPomodoro}
          taskTitle={task.title}
        />
      </div>

      <button
        className="hidden w-full min-w-0 max-w-full overflow-hidden rounded-md text-left md:block"
        onClick={onOpen}
        type="button"
      >
        <span
          className={cn(
            "block truncate text-[13px] font-medium text-[#2f3b45]",
            completed && "text-[#858d91] line-through",
          )}
        >
          {task.title}
        </span>
      </button>
      <div className="hidden min-w-0 md:block">
        <TaskStatusSelect
          ariaLabel={`Cambiar estado de ${task.title}`}
          className="h-6 w-fit max-w-full px-2 text-[10px]"
          disabled={!canEditTasks || pendingField !== null}
          onChange={updateStatus}
          value={displayTask.status}
        />
      </div>
      <div className="hidden min-w-0 md:block">
        <TaskPrioritySelect
          ariaLabel={`Cambiar prioridad de ${task.title}`}
          className="h-6 w-fit max-w-full px-2 text-[10px]"
          disabled={!canEditTasks || pendingField !== null}
          onChange={updatePriority}
          value={displayTask.priority}
        />
      </div>
      <div className="hidden min-w-0 md:block">
        <TaskDueDateCell
          className="w-full"
          disabled={!canEditTasks || pendingField !== null}
          onChange={updateDueDate}
          pending={pendingField === "dueDate"}
          status={displayTask.status}
          title={task.title}
          value={displayDueDate}
        />
      </div>
      <div className="hidden min-w-0 md:block">
        <TaskAssigneeSelect
          ariaLabel={`Cambiar responsable de ${task.title}`}
          className="w-full max-w-full justify-start text-left text-[11px]"
          disabled={
            !canEditTasks || pendingField !== null || members.length === 0
          }
          onChange={updateAssignee}
          options={assigneeOptions}
          value={displayAssigneeId}
        />
      </div>
      <div className="hidden justify-end md:flex">
        <TaskRowActions
          onOpen={onOpen}
          onStartPomodoro={onStartPomodoro}
          taskTitle={task.title}
        />
      </div>
    </article>
  );
}

function TaskDueDateCell({
  value,
  title,
  status,
  pending,
  disabled,
  onChange,
  className,
}: {
  value: string | null;
  title: string;
  status: Task["status"];
  pending: boolean;
  disabled: boolean;
  onChange: (value: string | null) => Promise<boolean>;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const isMobile = useIsMobile(1023);
  const overdue = isTaskOverdue({
    dueDate: value,
    status,
  });

  const openEditor = () => {
    setDraft(value ? toDatetimeLocal(value) : `${localDateKey(new Date())}T09:00`);
    setOpen(true);
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) openEditor();
    else setOpen(false);
  };

  const save = async (nextValue: string | null) => {
    if (await onChange(nextValue)) setOpen(false);
  };

  const trigger = (
    <button
      aria-label={`Cambiar fecha de vencimiento de ${title}`}
      className={cn(
        "inline-flex min-w-0 max-w-full items-center gap-1 rounded-md px-1.5 py-1 text-left text-[11px] font-medium text-[#5f6872] outline-none hover:bg-[#eff1f0] hover:text-[#1e3a5f] focus-visible:ring-2 focus-visible:ring-[#1e3a5f]/20 disabled:cursor-wait disabled:opacity-60",
        !value && "text-[#9aa2a5]",
        overdue && "font-semibold text-[#c73b52]",
        className,
      )}
      disabled={disabled || pending}
      type="button"
    >
      {value ? formatTaskDueDate(value) : "Sin fecha"}
    </button>
  );

  const editor = (
    <TaskDueDateEditor
      dueDateDraft={draft}
      fullWidth={isMobile}
      onCancel={() => setOpen(false)}
      onDateChange={(date) =>
        setDraft((current) => datetimeWithDate(current, date))
      }
      onRemove={() => void save(null)}
      onSave={() => void save(draft)}
      onTimeChange={(time) =>
        setDraft((current) => datetimeWithTime(current, time))
      }
      pending={pending}
    />
  );

  if (isMobile) {
    return (
      <Drawer
        fixed
        handleOnly
        onOpenChange={handleOpenChange}
        open={open}
      >
        <DrawerTrigger asChild>{trigger}</DrawerTrigger>
        <DrawerContent className="flex h-auto min-h-0 max-h-[calc(100dvh-1rem)] w-full max-w-none flex-col rounded-t-2xl border-[#dde1e2] bg-white p-0 shadow-[0_-8px_24px_rgba(31,41,51,0.08)]">
          <DrawerHeader className="flex shrink-0 flex-row items-center justify-between gap-3 border-b border-[#dde1e2] px-5 py-4 !text-left">
            <div className="min-w-0">
              <DrawerTitle className="text-[16px] font-semibold text-[#1e3a5f]">
                Vencimiento
              </DrawerTitle>
              <DrawerDescription className="!text-left">
                {draft ? formatTaskDueDate(draft) : "Elige una fecha"}
              </DrawerDescription>
            </div>
            <DrawerClose asChild>
              <button
                aria-label="Cerrar selector de vencimiento"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[#5f6872] hover:bg-[#eff1f0] hover:text-[#1f2933]"
                type="button"
              >
                <X size={19} />
              </button>
            </DrawerClose>
          </DrawerHeader>
          <div className="min-h-0 w-full flex-1 overflow-y-auto overscroll-contain">
            {editor}
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Popover onOpenChange={handleOpenChange} open={open}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent
        align="end"
        avoidCollisions
        className="max-h-[calc(100dvh-2rem)] w-auto max-w-[var(--radix-popover-content-available-width)] overflow-y-auto p-0"
        collisionPadding={16}
        hideWhenDetached
        side="bottom"
        sideOffset={8}
        sticky="always"
        updatePositionStrategy="always"
      >
        <div className="border-b border-[#dde1e2] px-4 py-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#858d91]">
            Vencimiento
          </p>
          <p className="mt-0.5 font-body-sm text-body-sm font-semibold text-[#2f3b45]">
            {draft ? formatTaskDueDate(draft) : "Elige una fecha"}
          </p>
        </div>
        {editor}
      </PopoverContent>
    </Popover>
  );
}

function TaskRowActions({
  taskTitle,
  onOpen,
  onStartPomodoro,
}: {
  taskTitle: string;
  onOpen: () => void;
  onStartPomodoro: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative flex shrink-0 justify-end">
      <button
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={`Acciones de ${taskTitle}`}
        className="flex h-11 w-11 items-center justify-center rounded-md text-[#858d91] hover:bg-[#e7e9e8] hover:text-[#1e3a5f]"
        onClick={() => setOpen((value) => !value)}
        type="button"
      >
        <MoreHorizontal size={17} />
      </button>
      {open && (
        <>
          <button
            aria-label="Cerrar acciones"
            className="fixed inset-0 z-20 cursor-default"
            onClick={() => setOpen(false)}
            type="button"
          />
          <div
            className="absolute right-0 top-12 z-30 w-48 rounded-lg border border-[#dde1e2] bg-white p-1.5 shadow-[0_12px_32px_rgba(31,41,51,0.12)]"
            role="menu"
          >
            <button
              className="flex min-h-10 w-full items-center gap-2 rounded-md px-3 text-left text-[13px] text-[#4f5a63] hover:bg-[#eff1f0] hover:text-[#1e3a5f]"
              onClick={() => {
                setOpen(false);
                onOpen();
              }}
              role="menuitem"
              type="button"
            >
              Ver tarea
            </button>
            <button
              className="flex min-h-10 w-full items-center gap-2 rounded-md px-3 text-left text-[13px] text-[#4f5a63] hover:bg-[#eff1f0] hover:text-[#1e3a5f]"
              onClick={() => {
                setOpen(false);
                onStartPomodoro();
              }}
              role="menuitem"
              type="button"
            >
              <Play size={14} /> Iniciar Pomodoro
            </button>
          </div>
        </>
      )}
    </div>
  );
}
