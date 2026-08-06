"use client";

import { Suspense, useMemo, useState } from "react";
import { LayoutGrid, List, Plus } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import type { Task, TaskPriority } from "@/types/entities";
import { archiveQuickNote } from "@/features/quicknotes/api/quicknotes";
import { BacklogPanel } from "@/features/tasks/components/BacklogPanel";
import { DayList } from "@/features/tasks/components/DayList";
import { MobileBacklog } from "@/features/tasks/components/MobileBacklog";
import { TaskModal, type TaskForm } from "@/features/tasks/components/TaskModal";
import { WeekNavigation } from "@/features/tasks/components/WeekNavigation";
import { WeeklyGrid } from "@/features/tasks/components/WeeklyGrid";
import { useTaskMutations, useTaskQuery, useTasksQuery } from "@/features/tasks/hooks/useTasks";
import { BACKLOG_CONTAINER, TasksDnDProvider, dayKeyFromContainerId } from "@/features/tasks/dnd/TasksDnDProvider";
import { dateKey } from "@/lib/tasks";
import { localDateKey } from "@/lib/utils";
import { useIsMobile } from "@/hooks/useIsMobile";

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
      params.delete("prefill");
      params.delete("quickNoteId");
      params.set("modal", "create");
      navigateWithModal(params);
    },
    openCreateWithDate: (dueDate: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.delete("taskId");
      params.set("modal", "create");
      params.set("prefill", encodeURIComponent(JSON.stringify({ title: "", dueDate })));
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
    return {
      title: typeof source.title === "string" ? source.title.trim() : "",
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

type TaskView = "grid" | "list";

const TASK_VIEW_KEY = "nisky:task-view";

function initialTaskView(): TaskView {
  if (typeof window === "undefined") return "grid";
  return localStorage.getItem(TASK_VIEW_KEY) === "list" ? "list" : "grid";
}

function TasksPageContent() {
  const router = useRouter();
  const [weekStart, setWeekStart] = useState(() => monday(new Date()));
  const [search, setSearch] = useState("");
  const [priority, setPriority] = useState<TaskPriority | "ALL">("ALL");
  const [dayOrder, setDayOrder] = useState<Record<string, string[]>>({});
  const [backlogOrder, setBacklogOrder] = useState<string[]>([]);
  const [view, setView] = useState<TaskView>(initialTaskView);
  const isMobile = useIsMobile(1023);
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

  const setTaskView = (next: TaskView) => {
    setView(next);
    localStorage.setItem(TASK_VIEW_KEY, next);
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
    const currentDueDate = task?.dueDate ? localDateKey(task.dueDate) : null;
    if (currentDueDate === dueDate) return;
    const previousDayOrder = dayOrder;
    if (currentDueDate) {
      setDayOrder((current) => ({
        ...current,
        [currentDueDate]: (current[currentDueDate] ?? []).filter((id) => id !== taskId),
      }));
    }
    try {
      await mutations.update.mutateAsync({ id: taskId, payload: { dueDate } });
      toast.success(dueDate ? "¡Listo, fecha actualizada!" : "¡Listo, la devolvimos a pendientes!");
    } catch {
      setDayOrder(previousDayOrder);
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

  const handleReorderBacklog = async (taskIds: string[]) => {
    const previous = backlogOrder;
    setBacklogOrder(taskIds);
    try {
      await mutations.reorder.mutateAsync(taskIds.map((id, order) => ({ id, order })));
    } catch {
      setBacklogOrder(previous);
      toast.error("Ups, no pudimos guardar el orden.");
    }
  };

  const handleReorderDispatch = (containerId: string, taskIds: string[]) => {
    if (containerId === BACKLOG_CONTAINER) return handleReorderBacklog(taskIds);
    return handleReorder(dayKeyFromContainerId(containerId), taskIds);
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
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="font-label-caps text-label-caps uppercase text-on-surface-variant">MI SEMANA</p>
            <h1 className="mt-1 font-headline-sm text-headline-sm text-primary">Mis tareas</h1>
          </div>
        </div>
        <div className="flex items-center justify-between gap-3 sm:justify-end">
          <span className="font-data-mono text-data-mono text-xs text-on-surface-variant sm:hidden">{weekLabel(weekStart)}</span>
          <div className="hidden items-center border border-outline-variant lg:flex">
            <button
              aria-label="Vista semana"
              aria-pressed={view === "grid"}
              className={`flex items-center gap-1.5 px-3 py-1.5 font-body-sm text-body-sm ${view === "grid" ? "bg-primary text-on-primary" : "text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface"}`}
              onClick={() => setTaskView("grid")}
              type="button"
            >
              <LayoutGrid size={15} /> Semana
            </button>
            <button
              aria-label="Vista lista"
              aria-pressed={view === "list"}
              className={`flex items-center gap-1.5 border-l border-outline-variant px-3 py-1.5 font-body-sm text-body-sm ${view === "list" ? "bg-primary text-on-primary" : "text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface"}`}
              onClick={() => setTaskView("list")}
              type="button"
            >
              <List size={15} /> Lista
            </button>
          </div>
          <WeekNavigation label={weekLabel(weekStart)} onNext={() => moveWeek(1)} onPrevious={() => moveWeek(-1)} onToday={() => setWeekStart(monday(new Date()))} />
        </div>
      </div>
      {query.isLoading ? (
        <div className="flex min-h-0 flex-1 items-center justify-center font-body-sm text-body-sm text-on-surface-variant">Cargando tus tareas...</div>
      ) : query.isError ? (
        <div className="flex min-h-0 flex-1 items-center justify-center font-body-sm text-body-sm text-error">Ups, no pudimos cargar tus tareas. Inténtalo de nuevo.</div>
      ) : (
        <TasksDnDProvider
          backlogOrder={backlogOrder}
          dayOrder={visibleDayOrder}
          onDragStateChange={() => {}}
          onMoveTask={(taskId, dueDate) => void moveTask(taskId, dueDate)}
          onReorder={handleReorderDispatch}
          tasks={tasks}
        >
          {isMobile ? (
            <div className="min-h-0 flex-1 flex-col overflow-y-auto pb-20">
              <DayList
                onCreateOnDay={(key) => modalUrl.openCreateWithDate(key)}
                onOpen={openEdit}
                onStartPomodoro={openFocus}
                onToggle={(task) => void toggleTask(task)}
                tasks={tasks}
                weekStart={weekStart}
              />
              <MobileBacklog
                onCreate={openCreate}
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
          ) : (
            <div className="min-h-0 flex-1 lg:flex">
              {view === "list" ? (
                <>
                  <div className="min-h-0 flex-1 flex-col overflow-y-auto">
                    <DayList
                      onCreateOnDay={(key) => modalUrl.openCreateWithDate(key)}
                      onOpen={openEdit}
                      onStartPomodoro={openFocus}
                      onToggle={(task) => void toggleTask(task)}
                      tasks={tasks}
                      weekStart={weekStart}
                    />
                  </div>
                  <BacklogPanel
                    onCreate={openCreate}
                    onOpen={openEdit}
                    onPriority={setPriority}
                    onSearch={setSearch}
                    onStartPomodoro={openFocus}
                    onToggle={(task) => void toggleTask(task)}
                    priority={priority}
                    search={search}
                    tasks={backlog}
                  />
                </>
              ) : (
                <>
                  <WeeklyGrid
                    onOpen={openEdit}
                    onStartPomodoro={openFocus}
                    onToggle={(task) => void toggleTask(task)}
                    tasks={tasks}
                    weekStart={weekStart}
                  />
                  <BacklogPanel
                    onCreate={openCreate}
                    onOpen={openEdit}
                    onPriority={setPriority}
                    onSearch={setSearch}
                    onStartPomodoro={openFocus}
                    onToggle={(task) => void toggleTask(task)}
                    priority={priority}
                    search={search}
                    tasks={backlog}
                  />
                </>
              )}
            </div>
          )}
        </TasksDnDProvider>
      )}
      <button
        aria-label="Nueva tarea"
        className="fixed bottom-6 right-6 z-40 flex h-12 w-12 items-center justify-center border border-outline-variant bg-primary text-on-primary hover:bg-primary-container hover:text-on-primary-container lg:hidden"
        onClick={openCreate}
        type="button"
      >
        <Plus size={22} />
      </button>
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
