"use client";

import { Suspense, useMemo, useState } from "react";
import { CalendarDays, CheckSquare, List, LayoutGrid, Plus, Trash2, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import type { Task, TaskPriority } from "@/types/entities";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { archiveQuickNote } from "@/features/quicknotes/api/quicknotes";
import { ProjectsSidebar } from "@/features/projects/components/ProjectsSidebar";
import { BacklogPanel } from "@/features/tasks/components/BacklogPanel";
import { DayList } from "@/features/tasks/components/DayList";
import { MobileBacklog } from "@/features/tasks/components/MobileBacklog";
import { MonthDayModal } from "@/features/tasks/components/MonthDayModal";
import { MonthlyCalendar } from "@/features/tasks/components/MonthlyCalendar";
import { PeriodNav } from "@/features/tasks/components/PeriodNav";
import { TaskList } from "@/features/tasks/components/TaskList";
import {
  TaskModal,
  type TaskForm,
} from "@/features/tasks/components/TaskModal";
import { WeeklyGrid } from "@/features/tasks/components/WeeklyGrid";
import {
  useTaskMutations,
  useTaskQuery,
  useTasksQuery,
} from "@/features/tasks/hooks/useTasks";
import {
  useAccessibleProjects,
  useProjectsQuery,
} from "@/features/projects/hooks/useProjects";
import {
  BACKLOG_CONTAINER,
  TasksDnDProvider,
  dayKeyFromContainerId,
} from "@/features/tasks/dnd/TasksDnDProvider";
import { dateKey } from "@/lib/tasks";
import { localDateKey } from "@/lib/utils";
import { useIsMobile } from "@/hooks/useIsMobile";
import {
  TaskSelectionProvider,
  useTaskSelection,
} from "@/features/tasks/selection/TaskSelectionContext";

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
      params.set(
        "prefill",
        encodeURIComponent(JSON.stringify({ title: "", dueDate })),
      );
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
    openFocus: (taskId: string, projectId?: string) => {
      const params = new URLSearchParams({ taskId });
      if (projectId) params.set("projectId", projectId);
      router.push(`/focus?${params.toString()}`);
    },
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

function monthLabel(date: Date) {
  const label = date.toLocaleDateString("es-CO", { month: "long", year: "numeric" });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function firstOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function mondayOfMonth(date: Date, amount: number) {
  return monday(new Date(date.getFullYear(), date.getMonth() + amount, 1));
}

function parsePrefill(value: string | null): Partial<TaskForm> | undefined {
  if (!value) return undefined;
  try {
    const parsed: unknown = JSON.parse(decodeURIComponent(value));
    if (!parsed || typeof parsed !== "object") return undefined;
    const source = parsed as Record<string, unknown>;
    const rawDueDate = typeof source.dueDate === "string" ? source.dueDate : "";
    return {
      title: typeof source.title === "string" ? source.title.trim() : "",
      dueDate: /^\d{4}-\d{2}-\d{2}$/.test(rawDueDate) ? `${rawDueDate}T23:59` : rawDueDate,
      status: "PENDING",
      priority: "NORMAL",
      description: "",
      pomodoroEstimate: 0,
    };
  } catch {
    return undefined;
  }
}

type TaskView = "week" | "month" | "list";

const TASK_VIEW_KEY = "nisky:task-view";
const TASK_PROJECT_FILTER_KEY = "nisky:task-filter-project";

function initialTaskView(): TaskView {
  if (typeof window === "undefined") return "week";
  const value = localStorage.getItem(TASK_VIEW_KEY);
  return value === "month" || value === "list" ? value : "week";
}

function initialProjectFilter(): string | null {
  if (typeof window === "undefined") return null;
  const value = localStorage.getItem(TASK_PROJECT_FILTER_KEY);
  return value || null;
}

function TasksPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [weekStart, setWeekStart] = useState(() => monday(new Date()));
  const [monthStart, setMonthStart] = useState(() => firstOfMonth(new Date()));
  const [selectedMonthDay, setSelectedMonthDay] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [priority, setPriority] = useState<TaskPriority | "ALL">("ALL");
  const [dayOrder, setDayOrder] = useState<Record<string, string[]>>({});
  const [backlogOrder, setBacklogOrder] = useState<string[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(
    () => searchParams.get("projectId") ?? initialProjectFilter(),
  );
  const [view, setView] = useState<TaskView>(initialTaskView);
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);
  const isMobile = useIsMobile(1023);
  const selection = useTaskSelection();
  const modalUrl = useModalUrl();
  const query = useTasksQuery({
    q: search || undefined,
    priority: priority === "ALL" ? undefined : priority,
  });
  const urlTaskQuery = useTaskQuery(modalUrl.state.taskId);
  const mutations = useTaskMutations();
  const projectsQuery = useProjectsQuery();
  const accessibleProjectsQuery = useAccessibleProjects();
  const allProjects = useMemo(() => {
    const merged = [...(projectsQuery.data ?? [])];
    for (const project of accessibleProjectsQuery.data ?? []) {
      if (!merged.some((item) => item.id === project.id)) merged.push(project);
    }
    return merged;
  }, [projectsQuery.data, accessibleProjectsQuery.data]);
  const allTasks = query.data?.data ?? emptyTasks;
  const tasks = useMemo(
    () =>
      selectedProjectId
        ? allTasks.filter((task) => task.projectId === selectedProjectId)
        : allTasks,
    [allTasks, selectedProjectId],
  );
  const taskCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const task of allTasks) {
      if (
        !task.projectId ||
        task.status === "COMPLETED" ||
        task.status === "CANCELLED"
      )
        continue;
      counts[task.projectId] = (counts[task.projectId] ?? 0) + 1;
    }
    return counts;
  }, [allTasks]);
  const backlog = useMemo(() => tasks.filter((task) => !task.dueDate), [tasks]);
  const selectedTasks = useMemo(
    () => tasks.filter((task) => selection.selectedIds.has(task.id)),
    [tasks, selection.selectedIds],
  );
  const isBulkMoveNoop = (projectId: string | null) =>
    selectedTasks.length > 0 &&
    selectedTasks.every((task) => (task.projectId ?? null) === projectId);
  const taskFromUrl =
    urlTaskQuery.data ??
    tasks.find((task) => task.id === modalUrl.state.taskId) ??
    null;
  const editingTask = taskFromUrl;
  const modalOpen = Boolean(modalUrl.state.taskId || modalUrl.state.create);
  const initialForm = parsePrefill(modalUrl.state.prefill);
  const taskDefaultProjectId =
    selectedProjectId ??
    projectsQuery.data?.find((project) => project.isDefault)?.id;

  const visibleDayOrder = useMemo(() => {
    const next = { ...dayOrder };
    for (let index = 0; index < 7; index += 1) {
      const currentDate = new Date(weekStart);
      currentDate.setDate(currentDate.getDate() + index);
      const key = dateKey(currentDate);
      const currentIds = tasks
        .filter((task) => task.dueDate && dateKey(task.dueDate) === key)
        .sort(
          (a, b) => a.order - b.order || a.createdAt.localeCompare(b.createdAt),
        )
        .map((task) => task.id);
      const existing =
        dayOrder[key]?.filter((id) => currentIds.includes(id)) ?? [];
      next[key] = [
        ...existing,
        ...currentIds.filter((id) => !existing.includes(id)),
      ];
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

  const moveMonth = (amount: number) => {
    setSelectedMonthDay(null);
    setMonthStart((current) =>
      new Date(current.getFullYear(), current.getMonth() + amount, 1),
    );
  };

  const jumpWeekMonth = (amount: number) => {
    setWeekStart((current) => {
      const target = mondayOfMonth(current, amount);
      const currentTime = current.getTime();
      if (amount > 0 && target.getTime() <= currentTime) {
        target.setDate(target.getDate() + 7);
      }
      if (amount < 0 && target.getTime() >= currentTime) {
        target.setDate(target.getDate() - 7);
      }
      return target;
    });
  };

  const setTaskView = (next: TaskView) => {
    if (next === "month") {
      setMonthStart(firstOfMonth(weekStart));
    }
    setView(next);
    localStorage.setItem(TASK_VIEW_KEY, next);
  };

  const toggleTask = async (task: Task) => {
    try {
      await mutations.update.mutateAsync({
        id: task.id,
        payload: {
          status: task.status === "COMPLETED" ? "PENDING" : "COMPLETED",
        },
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
        [currentDueDate]: (current[currentDueDate] ?? []).filter(
          (id) => id !== taskId,
        ),
      }));
    }
    try {
      await mutations.update.mutateAsync({ id: taskId, payload: { dueDate } });
      toast.success(
        dueDate
          ? "¡Listo, fecha actualizada!"
          : "¡Listo, la devolvimos a pendientes!",
      );
    } catch {
      setDayOrder(previousDayOrder);
      toast.error("Ups, no pudimos mover la tarea. Inténtalo de nuevo.");
    }
  };

  const handleReorder = async (key: string, taskIds: string[]) => {
    const previous = dayOrder;
    setDayOrder((current) => ({ ...current, [key]: taskIds }));
    try {
      await mutations.reorder.mutateAsync(
        taskIds.map((id, order) => ({ id, order })),
      );
    } catch {
      setDayOrder(previous);
      toast.error("Ups, no pudimos guardar el orden.");
    }
  };

  const handleReorderBacklog = async (taskIds: string[]) => {
    const previous = backlogOrder;
    setBacklogOrder(taskIds);
    try {
      await mutations.reorder.mutateAsync(
        taskIds.map((id, order) => ({ id, order })),
      );
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
      recurrence: {
        repeatType: form.recurrence?.repeatType,
        repeatInterval: form.recurrence?.repeatInterval ?? 1,
        repeatDaysOfWeek: form.recurrence?.repeatDaysOfWeek ?? [],
        repeatDayOfMonth: form.recurrence?.repeatDayOfMonth,
        repeatEndsAt: form.recurrence?.repeatEndsAt || null,
      },
    };
    try {
      if (editingTask) {
        const updatePayload = { ...payload } as Partial<typeof payload>;
        await mutations.update.mutateAsync({
          id: editingTask.id,
          payload: updatePayload,
        });
      } else {
        await mutations.create.mutateAsync(payload);
        if (modalUrl.state.quickNoteId) {
          try {
            await archiveQuickNote(modalUrl.state.quickNoteId);
          } catch {
            toast.warning(
              "La tarea se creó, pero no pudimos guardar tu nota original.",
            );
          }
        }
      }
      modalUrl.close();
      toast.success(
        editingTask ? "¡Listo, tarea actualizada!" : "¡Listo, tarea creada!",
      );
    } catch {
      toast.error("Ups, no pudimos guardar la tarea. Inténtalo de nuevo.");
    }
  };

  const openCreate = () => modalUrl.openCreate();
  const openEdit = (task: Task) => modalUrl.openTask(task.id);
  const openFocus = (task: Task) => modalUrl.openFocus(task.id, task.projectId ?? undefined);
  const closeModal = () => modalUrl.close();

  const selectProject = (projectId: string | null) => {
    setSelectedProjectId(projectId);
    if (projectId === null) localStorage.removeItem(TASK_PROJECT_FILTER_KEY);
    else localStorage.setItem(TASK_PROJECT_FILTER_KEY, projectId);
  };

  const toggleSelectionMode = () => {
    if (selection.mode) selection.clear();
    else selection.setMode(true);
  };

  const handleBulkDelete = async () => {
    try {
      await mutations.bulkRemove.mutateAsync(Array.from(selection.selectedIds));
      selection.clear();
      setConfirmBulkDelete(false);
      toast.success("¡Listo, tareas eliminadas!");
    } catch (error) {
      const message =
        (error as { message?: string } | null)?.message ??
        "Ups, no pudimos eliminar las tareas. Inténtalo de nuevo.";
      toast.error(message);
    }
  };

  const handleBulkMove = async (projectId: string | null) => {
    try {
      await mutations.bulkMove.mutateAsync({
        ids: Array.from(selection.selectedIds),
        projectId,
      });
      selection.clear();
      toast.success("¡Listo, tareas movidas!");
    } catch (error) {
      const message =
        (error as { message?: string } | null)?.message ??
        "Ups, no pudimos mover las tareas. Inténtalo de nuevo.";
      toast.error(message);
    }
  };

  const rightPanel = (
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
  );

  return (
    <section className="flex h-full min-h-0 flex-col bg-surface">
      <div className="flex shrink-0 flex-col gap-3 border-b border-outline-variant bg-surface-bright p-container-padding sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="font-label-caps text-label-caps uppercase text-on-surface-variant">
              {view === "month" ? "MI MES" : view === "list" ? "TODAS LAS TAREAS" : "MI SEMANA"}
            </p>
            <h1 className="mt-1 font-headline-sm text-headline-sm text-primary">
              Mis tareas
            </h1>
          </div>
        </div>
        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center sm:justify-end">
          <button
            aria-label="Seleccionar tareas"
            aria-pressed={selection.mode}
            className={`flex h-9 items-center gap-1.5 border border-outline-variant px-3 font-body-sm text-body-sm ${selection.mode ? "bg-primary text-on-primary" : "text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface"}`}
            onClick={toggleSelectionMode}
            type="button"
          >
            <CheckSquare size={15} /> Seleccionar
          </button>
          <span className="font-data-mono text-data-mono text-xs text-on-surface-variant sm:hidden">
            {view === "month" ? monthLabel(monthStart) : weekLabel(weekStart)}
          </span>
          <div className="flex items-center gap-2">
            <button
              aria-label="Vista semana"
              aria-pressed={view === "week"}
              className={`flex items-center gap-1.5 border border-outline-variant px-3 py-1.5 font-body-sm text-body-sm ${view === "week" ? "bg-primary text-on-primary" : "text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface"}`}
              onClick={() => setTaskView("week")}
              type="button"
            >
              <LayoutGrid size={15} /> Semana
            </button>
            <button
              aria-label="Vista mes"
              aria-pressed={view === "month"}
              className={`flex items-center gap-1.5 border border-outline-variant px-3 py-1.5 font-body-sm text-body-sm ${view === "month" ? "bg-primary text-on-primary" : "text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface"}`}
              onClick={() => setTaskView("month")}
              type="button"
            >
              <CalendarDays size={15} /> Mes
            </button>
            <button
              aria-label="Vista lista"
              aria-pressed={view === "list"}
              className={`flex items-center gap-1.5 border border-outline-variant px-3 py-1.5 font-body-sm text-body-sm ${view === "list" ? "bg-primary text-on-primary" : "text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface"}`}
              onClick={() => setTaskView("list")}
              type="button"
            >
              <List size={15} /> Lista
            </button>
          </div>
          <div className="flex items-center gap-2 lg:hidden">
            <select
              aria-label="Filtrar por proyecto"
              className="field h-9 min-w-0 flex-1"
              onChange={(event) => selectProject(event.target.value || null)}
              value={selectedProjectId ?? ""}
            >
              <option value="">Todos</option>
              {allProjects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </div>
          {view === "month" ? (
            <PeriodNav
              jumpNextLabel="Saltar un año adelante"
              jumpPreviousLabel="Saltar un año atrás"
              label={monthLabel(monthStart)}
              nextLabel="Mes siguiente"
              onJumpNext={() => moveMonth(12)}
              onJumpPrevious={() => moveMonth(-12)}
              onNext={() => moveMonth(1)}
              onPrevious={() => moveMonth(-1)}
              onToday={() => {
                setSelectedMonthDay(null);
                setMonthStart(firstOfMonth(new Date()));
              }}
              previousLabel="Mes anterior"
            />
          ) : (
            <PeriodNav
              jumpNextLabel="Saltar un mes adelante"
              jumpPreviousLabel="Saltar un mes atrás"
              label={weekLabel(weekStart)}
              onJumpNext={() => jumpWeekMonth(1)}
              onJumpPrevious={() => jumpWeekMonth(-1)}
              onNext={() => moveWeek(1)}
              onPrevious={() => moveWeek(-1)}
              onToday={() => setWeekStart(monday(new Date()))}
              nextLabel="Semana siguiente"
              previousLabel="Semana anterior"
            />
          )}
        </div>
      </div>
      {selection.mode && (
        <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-outline-variant bg-secondary-container/30 px-container-padding py-2">
          <span className="mr-1 font-body-sm text-body-sm font-bold text-on-surface">
            {selection.selectedIds.size}{" "}
            {selection.selectedIds.size === 1 ? "tarea seleccionada" : "tareas seleccionadas"}
          </span>
          <select
            aria-label="Mover selección a proyecto"
            className="field h-8 min-w-0 flex-1 text-xs sm:flex-none"
            disabled={selection.selectedIds.size === 0 || mutations.bulkMove.isPending}
            onChange={(event) => {
              const value = event.target.value;
              if (!value) return;
              void handleBulkMove(value === "__none__" ? null : value);
            }}
            value=""
          >
            <option value="">Mover a proyecto...</option>
            <option disabled={isBulkMoveNoop(null)} value="__none__">Sin proyecto</option>
            {projectsQuery.data?.map((project) => (
              <option disabled={isBulkMoveNoop(project.id)} key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
          <button
            aria-label="Eliminar tareas seleccionadas"
            className="flex h-8 items-center gap-1.5 border border-outline-variant px-3 font-body-sm text-body-sm text-error hover:bg-error hover:text-error-foreground disabled:opacity-50"
            disabled={selection.selectedIds.size === 0}
            onClick={() => setConfirmBulkDelete(true)}
            type="button"
          >
            <Trash2 size={14} /> Eliminar
          </button>
          <button
            aria-label="Salir del modo selección"
            className="flex h-8 items-center gap-1.5 border border-outline-variant px-3 font-body-sm text-body-sm text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface"
            onClick={selection.clear}
            type="button"
          >
            <X size={14} /> Salir
          </button>
        </div>
      )}
      {query.isLoading ? (
        <div className="flex min-h-0 flex-1 items-center justify-center font-body-sm text-body-sm text-on-surface-variant">
          Cargando tus tareas...
        </div>
      ) : query.isError ? (
        <div className="flex min-h-0 flex-1 items-center justify-center font-body-sm text-body-sm text-error">
          Ups, no pudimos cargar tus tareas. Inténtalo de nuevo.
        </div>
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
            <div className={`min-h-0 flex-1 overflow-y-auto pb-20 ${view === "month" ? "flex flex-col" : ""}`}>
              {view === "month" ? (
                <MonthlyCalendar
                  monthStart={monthStart}
                  onSelectDay={setSelectedMonthDay}
                  projects={allProjects}
                  selectedDayKey={selectedMonthDay}
                  tasks={tasks}
                />
              ) : view === "list" ? (
                <TaskList
                  onCreate={openCreate}
                  onCreateOnDay={(key) => modalUrl.openCreateWithDate(key)}
                  onOpen={openEdit}
                  onStartPomodoro={openFocus}
                  onToggle={(task) => void toggleTask(task)}
                  tasks={tasks}
                />
              ) : (
                <DayList
                  onCreateOnDay={(key) => modalUrl.openCreateWithDate(key)}
                  onOpen={openEdit}
                  onStartPomodoro={openFocus}
                  onToggle={(task) => void toggleTask(task)}
                  tasks={tasks}
                  weekStart={weekStart}
                />
              )}
              {view !== "month" && (
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
              )}
            </div>
          ) : (
            <div className="min-h-0 flex-1 lg:flex">
              <aside className="hidden w-60 shrink-0 flex-col border-r border-outline-variant bg-surface lg:flex">
                <ProjectsSidebar
                  onSelect={selectProject}
                  projects={allProjects}
                  selectedProjectId={selectedProjectId}
                  taskCounts={taskCounts}
                />
              </aside>
              <div className="min-h-0 min-w-0 flex-1 lg:flex">
                {view === "week" ? (
                  <>
                    <WeeklyGrid
                      onOpen={openEdit}
                      onStartPomodoro={openFocus}
                      onToggle={(task) => void toggleTask(task)}
                      tasks={tasks}
                      weekStart={weekStart}
                    />
                    {rightPanel}
                  </>
                ) : view === "month" ? (
                  <>
                    <MonthlyCalendar
                      monthStart={monthStart}
                      onSelectDay={setSelectedMonthDay}
                      projects={allProjects}
                      selectedDayKey={selectedMonthDay}
                      tasks={tasks}
                    />
                    {rightPanel}
                  </>
                ) : (
                  <>
                    <TaskList
                      onCreate={openCreate}
                      onCreateOnDay={(key) => modalUrl.openCreateWithDate(key)}
                      onOpen={openEdit}
                      onStartPomodoro={openFocus}
                      onToggle={(task) => void toggleTask(task)}
                      tasks={tasks}
                    />
                    {rightPanel}
                  </>
                )}
              </div>
            </div>
          )}
        </TasksDnDProvider>
      )}
      {selectedMonthDay && (
        <MonthDayModal
          dayKey={selectedMonthDay}
          onClose={() => setSelectedMonthDay(null)}
          onCreate={() => modalUrl.openCreateWithDate(selectedMonthDay)}
          onOpen={openEdit}
          onStartPomodoro={openFocus}
          onToggle={(task) => void toggleTask(task)}
          tasks={tasks.filter(
            (task) => task.dueDate && dateKey(task.dueDate) === selectedMonthDay,
          )}
        />
      )}
      <button
        aria-label="Nueva tarea"
        className="fixed bottom-6 right-6 z-40 flex h-12 w-12 items-center justify-center border border-outline-variant bg-primary text-on-primary hover:bg-primary-container hover:text-on-primary-container lg:hidden"
        onClick={openCreate}
        type="button"
      >
        <Plus size={22} />
      </button>
      {confirmBulkDelete && (
        <ConfirmModal
          confirmLabel="Eliminar"
          danger
          loading={mutations.bulkRemove.isPending}
          message={`Se eliminarán ${selection.selectedIds.size} ${selection.selectedIds.size === 1 ? "tarea" : "tareas"}. Esta acción no se puede deshacer.`}
          onClose={() => setConfirmBulkDelete(false)}
          onConfirm={() => void handleBulkDelete()}
          title="¿Eliminar tareas seleccionadas?"
        />
      )}
      {modalOpen && (!modalUrl.state.taskId || editingTask) && (
        <TaskModal
          defaultProjectId={taskDefaultProjectId}
          initialForm={initialForm}
          key={editingTask?.id ?? modalUrl.state.prefill ?? "new"}
          onAddSubtask={async (taskId, title) => {
            await mutations.addSubtask.mutateAsync({ taskId, title });
          }}
          onClose={closeModal}
          projects={allProjects}
          onDelete={
            editingTask
              ? async () => {
                  try {
                    await mutations.remove.mutateAsync(editingTask.id);
                    modalUrl.close();
                    toast.success("¡Listo, tarea eliminada!");
                  } catch {
                    toast.error(
                      "Ups, no pudimos eliminarla. Inténtalo de nuevo.",
                    );
                  }
                }
              : undefined
          }
          onDeleteSubtask={async (taskId, subtaskId) => {
            await mutations.removeSubtask.mutateAsync({ taskId, subtaskId });
          }}
          onSave={saveTask}
          onStartPomodoro={
            editingTask ? () => modalUrl.openFocus(editingTask.id, editingTask.projectId ?? undefined) : undefined
          }
          onToggleSubtask={async (taskId, subtaskId, completed) => {
            await mutations.toggleSubtask.mutateAsync({
              taskId,
              subtaskId,
              completed,
            });
          }}
          task={editingTask}
        />
      )}
    </section>
  );
}

export default function TasksPage() {
  return (
    <TaskSelectionProvider>
      <Suspense
        fallback={
          <div className="flex h-full items-center justify-center font-body-sm text-body-sm text-on-surface-variant">
            Cargando tus tareas...
          </div>
        }
      >
        <TasksPageContent />
      </Suspense>
    </TaskSelectionProvider>
  );
}
