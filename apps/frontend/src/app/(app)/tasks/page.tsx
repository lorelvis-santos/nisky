"use client";

import { Suspense, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import type { Task, TaskPriority } from "@/types/entities";
import { archiveQuickNote } from "@/features/quicknotes/api/quicknotes";
import { BacklogPanel } from "@/features/tasks/components/BacklogPanel";
import { TaskModal, type TaskForm } from "@/features/tasks/components/TaskModal";
import { WeekNavigation } from "@/features/tasks/components/WeekNavigation";
import { WeeklyGrid, dateKey } from "@/features/tasks/components/WeeklyGrid";
import { useTaskMutations, useTaskQuery, useTasksQuery } from "@/features/tasks/hooks/useTasks";

const emptyTasks: Task[] = [];

function useModalUrl() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const state = {
    taskId: searchParams.get("taskId"),
    create: searchParams.get("modal") === "create",
    prefill: searchParams.get("prefill"),
    quickNoteId: searchParams.get("quickNoteId"),
  };

  const navigateWithModal = (params: URLSearchParams, replace = false) => {
    const query = params.toString();
    const url = query ? `${pathname}?${query}` : pathname;
    if (replace) router.replace(url, { scroll: false });
    else router.push(url, { scroll: false });
  };

  return {
    state,
    openTask: (taskId: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.delete("modal");
      params.delete("prefill");
      params.delete("quickNoteId");
      params.set("taskId", taskId);
      navigateWithModal(params);
    },
    openCreate: () => {
      const params = new URLSearchParams(searchParams.toString());
      params.delete("taskId");
      params.set("modal", "create");
      navigateWithModal(params);
    },
    close: () => {
      const params = new URLSearchParams(searchParams.toString());
      params.delete("taskId");
      params.delete("modal");
      params.delete("prefill");
      params.delete("quickNoteId");
      navigateWithModal(params, true);
    },
    openFocus: (taskId: string) => router.push(`/focus?taskId=${encodeURIComponent(taskId)}`),
  };
}

function monday(date: Date) {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  const day = result.getDay();
  result.setDate(result.getDate() - (day === 0 ? 6 : day - 1));
  return result;
}

function weekLabel(start: Date) {
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  return `${start.toLocaleDateString("es-CO", { day: "2-digit", month: "short" })} - ${end.toLocaleDateString("es-CO", { day: "2-digit", month: "short" })}`;
}

function parsePrefill(value: string | null): Partial<TaskForm> | undefined {
  if (!value) return undefined;
  try {
    const parsed: unknown = JSON.parse(decodeURIComponent(value));
    if (!parsed || typeof parsed !== "object") return undefined;
    const source = parsed as Record<string, unknown>;
    if (typeof source.title !== "string" || !source.title.trim()) return undefined;
    return {
      title: source.title.trim(),
      dueDate: typeof source.dueDate === "string" ? source.dueDate : "",
      status: "PENDING",
      priority: "NORMAL",
      description: "",
      pomodoroEstimate: 0,
    };
  } catch {
    return undefined;
  }
}

function TasksPageContent() {
  const router = useRouter();
  const [weekStart, setWeekStart] = useState(() => monday(new Date()));
  const [search, setSearch] = useState("");
  const [priority, setPriority] = useState<TaskPriority | "ALL">("ALL");
  const [isDragging, setIsDragging] = useState(false);
  const [dayOrder, setDayOrder] = useState<Record<string, string[]>>({});
  const modalUrl = useModalUrl();
  const query = useTasksQuery({ q: search || undefined, priority: priority === "ALL" ? undefined : priority });
  const urlTaskQuery = useTaskQuery(modalUrl.state.taskId);
  const mutations = useTaskMutations();
  const tasks = query.data?.data ?? emptyTasks;
  const backlog = useMemo(() => tasks.filter((task) => !task.dueDate), [tasks]);
  const taskFromUrl = urlTaskQuery.data ?? tasks.find((task) => task.id === modalUrl.state.taskId) ?? null;
  const editingTask = taskFromUrl;
  const modalOpen = Boolean(modalUrl.state.taskId || modalUrl.state.create);
  const initialForm = parsePrefill(modalUrl.state.prefill);

  const visibleDayOrder = useMemo(() => {
    const next = { ...dayOrder };
    for (let index = 0; index < 7; index += 1) {
      const currentDate = new Date(weekStart);
      currentDate.setDate(currentDate.getDate() + index);
      const key = dateKey(currentDate);
      const currentIds = tasks
        .filter((task) => task.dueDate && dateKey(task.dueDate) === key)
        .sort((a, b) => a.order - b.order || a.createdAt.localeCompare(b.createdAt))
        .map((task) => task.id);
      const existing = dayOrder[key]?.filter((id) => currentIds.includes(id)) ?? [];
      next[key] = [...existing, ...currentIds.filter((id) => !existing.includes(id))];
    }
    return next;
  }, [dayOrder, tasks, weekStart]);

  const moveWeek = (amount: number) => {
    setWeekStart((current) => {
      const next = new Date(current);
      next.setDate(next.getDate() + amount * 7);
      return next;
    });
  };

  const toggleTask = async (task: Task) => {
    try {
      await mutations.update.mutateAsync({
        id: task.id,
        payload: { status: task.status === "COMPLETED" ? "PENDING" : "COMPLETED" },
      });
    } catch {
      toast.error("Ups, no pudimos actualizar la tarea.");
    }
  };

  const moveTask = async (taskId: string, dueDate: string | null) => {
    const task = tasks.find((item) => item.id === taskId);
    const currentDueDate = task?.dueDate ? task.dueDate.slice(0, 10) : null;
    if (currentDueDate === dueDate) return;
    try {
      await mutations.update.mutateAsync({ id: taskId, payload: { dueDate } });
      toast.success(dueDate ? "¡Listo, fecha actualizada!" : "¡Listo, la devolvimos a pendientes!");
    } catch {
      toast.error("Ups, no pudimos mover la tarea. Inténtalo de nuevo.");
    }
  };

  const handleReorder = async (key: string, taskIds: string[]) => {
    const previous = dayOrder;
    setDayOrder((current) => ({ ...current, [key]: taskIds }));
    try {
      await mutations.reorder.mutateAsync(taskIds.map((id, order) => ({ id, order })));
    } catch {
      setDayOrder(previous);
      toast.error("Ups, no pudimos guardar el orden.");
    }
  };

  const saveTask = async (form: TaskForm) => {
    const payload = {
      ...form,
      description: form.description || undefined,
      dueDate: form.dueDate || undefined,
    };
    try {
      if (editingTask) {
        await mutations.update.mutateAsync({ id: editingTask.id, payload });
      } else {
        await mutations.create.mutateAsync(payload);
        if (modalUrl.state.quickNoteId) {
          try {
            await archiveQuickNote(modalUrl.state.quickNoteId);
          } catch {
            toast.warning("La tarea se creó, pero no pudimos guardar tu nota original.");
          }
        }
      }
      modalUrl.close();
      toast.success(editingTask ? "¡Listo, tarea actualizada!" : "¡Listo, tarea creada!");
    } catch {
      toast.error("Ups, no pudimos guardar la tarea. Inténtalo de nuevo.");
    }
  };

  const openCreate = () => modalUrl.openCreate();
  const openEdit = (task: Task) => modalUrl.openTask(task.id);
  const openFocus = (task: Task) => modalUrl.openFocus(task.id);
  const closeModal = () => modalUrl.close();

  return (
    <section className="flex h-full min-h-0 flex-col bg-surface">
      <div className="flex shrink-0 flex-col gap-3 border-b border-outline-variant bg-surface-bright p-container-padding sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-label-caps text-label-caps uppercase text-on-surface-variant">MI SEMANA</p>
          <h1 className="mt-1 font-headline-sm text-headline-sm text-primary">Mis tareas</h1>
        </div>
        <div className="flex items-center justify-between gap-3 sm:justify-end">
          <span className="font-data-mono text-data-mono text-xs text-on-surface-variant sm:hidden">{weekLabel(weekStart)}</span>
          <WeekNavigation label={weekLabel(weekStart)} onNext={() => moveWeek(1)} onPrevious={() => moveWeek(-1)} onToday={() => setWeekStart(monday(new Date()))} />
        </div>
      </div>
      {query.isLoading ? (
        <div className="flex min-h-0 flex-1 items-center justify-center font-body-sm text-body-sm text-on-surface-variant">Cargando tus tareas...</div>
      ) : query.isError ? (
        <div className="flex min-h-0 flex-1 items-center justify-center font-body-sm text-body-sm text-error">Ups, no pudimos cargar tus tareas. Inténtalo de nuevo.</div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto lg:flex-row lg:overflow-hidden">
          <WeeklyGrid
            dayOrder={visibleDayOrder}
            isDragging={isDragging}
            onDragStateChange={setIsDragging}
            onMoveTask={(taskId, dueDate) => void moveTask(taskId, dueDate)}
            onOpen={openEdit}
            onReorder={(key, ids) => void handleReorder(key, ids)}
            onStartPomodoro={openFocus}
            onToggle={(task) => void toggleTask(task)}
            tasks={tasks}
            weekStart={weekStart}
          />
          <BacklogPanel
            onCreate={openCreate}
            onDragStateChange={setIsDragging}
            onMoveTask={(taskId) => void moveTask(taskId, null)}
            onOpen={openEdit}
            onPriority={setPriority}
            onSearch={setSearch}
            onStartPomodoro={openFocus}
            onToggle={(task) => void toggleTask(task)}
            priority={priority}
            search={search}
            tasks={backlog}
          />
        </div>
      )}
      {modalOpen && (!modalUrl.state.taskId || editingTask) && (
        <TaskModal
          initialForm={initialForm}
          key={editingTask?.id ?? modalUrl.state.prefill ?? "new"}
          onAddSubtask={async (taskId, title) => {
            await mutations.addSubtask.mutateAsync({ taskId, title });
          }}
          onClose={closeModal}
            onDelete={editingTask ? async () => {
            try {
              await mutations.remove.mutateAsync(editingTask.id);
              modalUrl.close();
              toast.success("¡Listo, tarea eliminada!");
            } catch {
              toast.error("Ups, no pudimos eliminarla. Inténtalo de nuevo.");
            }
          } : undefined}
          onDeleteSubtask={async (taskId, subtaskId) => {
            await mutations.removeSubtask.mutateAsync({ taskId, subtaskId });
          }}
          onSave={saveTask}
          onCreateReminder={editingTask ? () => router.push(`/reminders?taskId=${encodeURIComponent(editingTask.id)}&title=${encodeURIComponent(editingTask.title)}`) : undefined}
          onStartPomodoro={editingTask ? () => modalUrl.openFocus(editingTask.id) : undefined}
          onToggleSubtask={async (taskId, subtaskId, completed) => {
            await mutations.toggleSubtask.mutateAsync({ taskId, subtaskId, completed });
          }}
          task={editingTask}
        />
      )}
    </section>
  );
}

export default function TasksPage() {
  return (
    <Suspense fallback={<div className="flex h-full items-center justify-center font-body-sm text-body-sm text-on-surface-variant">Cargando tus tareas...</div>}>
      <TasksPageContent />
    </Suspense>
  );
}
