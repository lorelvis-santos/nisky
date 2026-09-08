"use client";

import { Suspense, useMemo, useState } from "react";
import {
  Check,
  CheckSquare,
  ChevronDown,
  Plus,
  Search,
  SlidersHorizontal,
  Trash2,
  X,
} from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import type { Project, Task, TaskPriority, TaskStatus } from "@/types/entities";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { FAB } from "@/components/ui/FAB";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { archiveQuickNote } from "@/features/quicknotes/api/quicknotes";
import { BacklogPanel } from "@/features/tasks/components/BacklogPanel";
import { TaskList } from "@/features/tasks/components/TaskList";
import { TaskPagination } from "@/features/tasks/components/TaskPagination";
import type { TaskUpdatePayload } from "@/features/tasks/api/tasks";
import {
  TaskModal,
  type TaskForm,
} from "@/features/tasks/components/TaskModal";
import { TaskPreviewModal } from "@/features/tasks/components/TaskPreviewModal";
import {
  usePaginatedTasksQuery,
  useTaskMutations,
  useTaskQuery,
} from "@/features/tasks/hooks/useTasks";
import {
  useAccessibleProjects,
  useProjectsQuery,
} from "@/features/projects/hooks/useProjects";
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
    edit: searchParams.get("modal") === "edit",
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
    openEdit: (taskId: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.delete("prefill");
      params.delete("quickNoteId");
      params.set("modal", "edit");
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

function parsePrefill(value: string | null): Partial<TaskForm> | undefined {
  if (!value) return undefined;
  try {
    const parsed: unknown = JSON.parse(decodeURIComponent(value));
    if (!parsed || typeof parsed !== "object") return undefined;
    const source = parsed as Record<string, unknown>;
    const rawDueDate = typeof source.dueDate === "string" ? source.dueDate : "";
    return {
      title: typeof source.title === "string" ? source.title.trim() : "",
      dueDate: /^\d{4}-\d{2}-\d{2}$/.test(rawDueDate)
        ? `${rawDueDate}T23:59`
        : rawDueDate,
      status: "PENDING",
      priority: "NORMAL",
      description: "",
      pomodoroEstimate: 0,
    };
  } catch {
    return undefined;
  }
}

type TaskView = "list" | "backlog";

const TASK_VIEW_KEY = "nisky:task-view";
const TASK_PROJECT_FILTER_KEY = "nisky:task-filter-project";

function initialTaskView(searchView?: string | null): TaskView {
  if (searchView === "backlog") return "backlog";
  if (typeof window === "undefined") return "list";
  const value = localStorage.getItem(TASK_VIEW_KEY);
  return value === "backlog" ? "backlog" : "list";
}

function initialProjectFilter(): string | null {
  if (typeof window === "undefined") return null;
  const value = localStorage.getItem(TASK_PROJECT_FILTER_KEY);
  return value || null;
}

function TasksPageContent() {
  const searchParams = useSearchParams();
  const [search, setSearch] = useState("");
  const [priority, setPriority] = useState<TaskPriority | "ALL">("ALL");
  const [statusFilter, setStatusFilter] = useState<
    "ACTIVE" | "COMPLETED" | "ALL"
  >("ACTIVE");
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(
    () => searchParams.get("projectId") ?? initialProjectFilter(),
  );
  const [sort, setSort] = useState<
    "priority" | "dueDate" | "createdAt" | "title"
  >("dueDate");
  const [view, setView] = useState<TaskView>(() =>
    initialTaskView(searchParams.get("view")),
  );
  const [taskPage, setTaskPage] = useState(1);
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const isMobile = useIsMobile(1023);
  const selection = useTaskSelection();
  const modalUrl = useModalUrl();
  const taskStatus: TaskStatus | TaskStatus[] | undefined =
    statusFilter === "ACTIVE"
      ? ["PENDING", "IN_PROGRESS"]
      : statusFilter === "COMPLETED"
        ? "COMPLETED"
        : undefined;
  const commonQuery = {
    q: search || undefined,
    priority: priority === "ALL" ? undefined : priority,
    status: taskStatus,
    projectId: selectedProjectId ?? undefined,
    sort,
    order:
      sort === "dueDate" || sort === "createdAt"
        ? ("asc" as const)
        : ("desc" as const),
  };
  const listQuery = usePaginatedTasksQuery(
    {
      ...commonQuery,
      due: "SET",
      page: view === "list" ? taskPage : 1,
    },
    { pageSize: view === "list" ? 10 : 1 },
  );
  const backlogQuery = usePaginatedTasksQuery(
    {
      ...commonQuery,
      due: "UNSET",
      page: view === "backlog" ? taskPage : 1,
    },
    { pageSize: view === "backlog" ? 25 : 1 },
  );
  const query = view === "backlog" ? backlogQuery : listQuery;
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
  const tasks = allTasks;
  const selectedTasks = useMemo(
    () => tasks.filter((task) => selection.selectedIds.has(task.id)),
    [tasks, selection.selectedIds],
  );
  const backlogCount = backlogQuery.data?.meta.totalItems ?? 0;
  const listCount = listQuery.data?.meta.totalItems ?? 0;
  const totalCount = backlogCount + listCount;
  const activeFilterCount =
    (statusFilter !== "ACTIVE" ? 1 : 0) +
    (priority !== "ALL" ? 1 : 0) +
    (selectedProjectId ? 1 : 0) +
    (sort !== "dueDate" ? 1 : 0);
  const isBulkMoveNoop = (projectId: string | null) =>
    selectedTasks.length > 0 &&
    selectedTasks.every((task) => (task.projectId ?? null) === projectId);
  const taskFromUrl =
    urlTaskQuery.data ??
    tasks.find((task) => task.id === modalUrl.state.taskId) ??
    null;
  const editingTask = modalUrl.state.edit ? taskFromUrl : null;
  const previewOpen = Boolean(taskFromUrl && modalUrl.state.taskId && !modalUrl.state.edit && !modalUrl.state.create);
  const modalOpen = Boolean(modalUrl.state.create || editingTask);
  const initialForm = parsePrefill(modalUrl.state.prefill);
  const taskDefaultProjectId =
    selectedProjectId ??
    projectsQuery.data?.find((project) => project.isDefault)?.id;

  const setTaskView = (next: TaskView) => {
    setTaskPage(1);
    selection.clear();
    setView(next);
    localStorage.setItem(TASK_VIEW_KEY, next);
  };

  const setTaskSearch = (value: string) => {
    setTaskPage(1);
    setSearch(value);
  };

  const setTaskPriority = (value: TaskPriority | "ALL") => {
    setTaskPage(1);
    setPriority(value);
  };

  const setTaskSort = (value: typeof sort) => {
    setTaskPage(1);
    setSort(value);
  };

  const setTaskStatus = (value: typeof statusFilter) => {
    setTaskPage(1);
    setStatusFilter(value);
  };

  const clearTaskFilters = () => {
    setTaskStatus("ACTIVE");
    setTaskPriority("ALL");
    selectProject(null);
    setTaskSort("dueDate");
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
        const updatePayload: TaskUpdatePayload = {
          ...payload,
          dueDate: form.dueDate || null,
        };
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
              "La tarea se creó, pero no pudimos archivar la captura original.",
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
  const openPreview = (task: Task) => modalUrl.openTask(task.id);
  const openEdit = (task: Task) => modalUrl.openEdit(task.id);
  const openFocus = (task: Task) =>
    modalUrl.openFocus(task.id, task.projectId ?? undefined);
  const closeModal = () => modalUrl.close();

  const selectProject = (projectId: string | null) => {
    setTaskPage(1);
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

  const postponeToday = async (task: Task) => {
    try {
      await mutations.update.mutateAsync({
        id: task.id,
        payload: { dueDate: `${localDateKey(new Date())}T23:59` },
      });
      toast.success("¡Listo, tarea pospuesta para hoy!");
    } catch {
      toast.error("Ups, no pudimos cambiar la fecha.");
    }
  };

  const taskPagination = query.data ? (
    <TaskPagination
      isFetching={query.isFetching}
      meta={query.data.meta}
      onPageChange={setTaskPage}
    />
  ) : null;

  return (
    <section className="flex h-full min-h-0 flex-col overflow-y-auto bg-background">
      <header className="shrink-0 border-b border-outline-variant bg-background">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 p-container-padding sm:px-6 sm:py-5 lg:px-10">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <h1 className="font-headline-lg text-headline-lg tracking-tight text-on-surface">
                Tareas
              </h1>
              <span className="rounded-full bg-surface-container px-2.5 py-1 font-label-md text-[11px] leading-4 text-on-surface-variant">
                {totalCount}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                aria-label="Seleccionar tareas"
                aria-pressed={selection.mode}
                className={`flex h-10 items-center gap-1.5 rounded-lg border border-outline-variant px-3 font-label-md text-label-md shadow-sm ${selection.mode ? "bg-primary text-on-primary" : "bg-surface-container-lowest text-on-surface-variant hover:text-on-surface"}`}
                onClick={toggleSelectionMode}
                type="button"
              >
                <CheckSquare size={15} /> Seleccionar
              </button>
              <button
                className="hidden h-10 items-center gap-1.5 rounded-lg bg-primary px-3.5 font-label-md text-label-md text-on-primary shadow-sm hover:bg-primary-container hover:text-on-primary-container sm:inline-flex"
                onClick={openCreate}
                type="button"
              >
                <Plus size={16} /> Nueva tarea
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <div
              aria-label="Sección de tareas"
              className="flex items-end gap-1 border-b border-outline-variant"
              role="tablist"
            >
              <button
                aria-selected={view === "list"}
                className={`flex min-h-11 items-center rounded-t-lg border-b-2 px-3 py-2 font-label-md text-[14px] leading-5 transition-colors ${view === "list" ? "border-secondary text-on-surface" : "border-transparent text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface"}`}
                onClick={() => setTaskView("list")}
                role="tab"
                type="button"
              >
                Lista
              </button>
              <button
                aria-selected={view === "backlog"}
                className={`flex min-h-11 items-center gap-1.5 rounded-t-lg border-b-2 px-3 py-2 font-label-md text-[14px] leading-5 transition-colors ${view === "backlog" ? "border-secondary text-on-surface" : "border-transparent text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface"}`}
                onClick={() => setTaskView("backlog")}
                role="tab"
                type="button"
              >
                 Sin fecha límite
                {backlogCount > 0 && (
                  <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-surface-container-highest px-1.5 py-0.5 font-label-md text-[11px] leading-4 font-semibold text-secondary">
                    {backlogCount}
                  </span>
                )}
              </button>
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex gap-2 lg:hidden">
                <div className="relative min-w-0 flex-1">
                  <Search
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-outline"
                    size={16}
                  />
                  <input
                    aria-label="Buscar tareas"
                    className="field h-10 w-full pl-9"
                    onChange={(event) => setTaskSearch(event.target.value)}
                    placeholder="Buscar tareas..."
                    type="search"
                    value={search}
                  />
                </div>
                <button
                  aria-expanded={filtersOpen}
                  aria-label="Abrir filtros"
                  className="flex h-10 shrink-0 items-center gap-1.5 rounded-lg border border-outline-variant bg-surface-container-lowest px-3 font-label-md text-label-md text-on-surface-variant shadow-sm hover:text-on-surface"
                  onClick={() => setFiltersOpen(true)}
                  type="button"
                >
                  <SlidersHorizontal size={16} />
                  <span>Filtros</span>
                  {activeFilterCount > 0 && (
                    <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-secondary-container px-1 font-label-sm text-label-sm font-semibold text-on-secondary-container">
                      {activeFilterCount}
                    </span>
                  )}
                </button>
              </div>

              <div className="hidden items-center gap-3 lg:flex">
                <div className="relative min-w-0 max-w-sm flex-1">
                  <Search
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-outline"
                    size={16}
                  />
                  <input
                    aria-label="Buscar tareas"
                    className="field h-10 w-full pl-9"
                    onChange={(event) => setTaskSearch(event.target.value)}
                    placeholder="Buscar tareas..."
                    type="search"
                    value={search}
                  />
                </div>
                <div className="relative shrink-0">
                  <button
                    aria-expanded={filtersOpen}
                    aria-haspopup="dialog"
                    className={`flex h-10 items-center gap-2 rounded-lg border px-3 font-label-md text-label-md shadow-sm transition-colors ${filtersOpen || activeFilterCount > 0 ? "border-secondary bg-secondary-container text-on-secondary-container" : "border-outline-variant bg-surface-container-lowest text-on-surface-variant hover:border-secondary hover:text-secondary"}`}
                    onClick={() => setFiltersOpen((open) => !open)}
                    type="button"
                  >
                    <SlidersHorizontal size={16} />
                    <span>Filtros</span>
                    {activeFilterCount > 0 && (
                      <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-secondary px-1 font-label-sm text-label-sm font-semibold text-on-secondary">
                        {activeFilterCount}
                      </span>
                    )}
                    <ChevronDown className={`transition-transform ${filtersOpen ? "rotate-180" : ""}`} size={15} />
                  </button>
                  {filtersOpen && (
                    <>
                      <button aria-label="Cerrar filtros" className="fixed inset-0 z-20 hidden cursor-default lg:block" onClick={() => setFiltersOpen(false)} type="button" />
                      <DesktopTaskFilters
                        allProjects={allProjects}
                        onClear={clearTaskFilters}
                        onClose={() => setFiltersOpen(false)}
                        onPriorityChange={setTaskPriority}
                        onProjectChange={selectProject}
                        onSortChange={setTaskSort}
                        onStatusChange={setTaskStatus}
                        priority={priority}
                        selectedProjectId={selectedProjectId}
                        sort={sort}
                        statusFilter={statusFilter}
                      />
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>
      {isMobile && (
        <Drawer fixed open={filtersOpen} onOpenChange={setFiltersOpen} repositionInputs>
          <DrawerContent className="flex h-[min(85dvh,42rem)] min-h-0 max-h-[85dvh] overflow-hidden border-outline-variant bg-surface-bright">
          <DrawerHeader className="flex shrink-0 flex-row items-center justify-between border-b border-outline-variant px-5 py-4 text-left">
            <div>
              <DrawerTitle className="text-left">Filtrar tareas</DrawerTitle>
              <DrawerDescription>
                Elige cómo quieres ver tus tareas.
              </DrawerDescription>
            </div>
            <DrawerClose asChild>
              <button
                aria-label="Cerrar filtros"
                className="flex h-10 w-10 items-center justify-center rounded-lg text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface"
                type="button"
              >
                <X size={19} />
              </button>
            </DrawerClose>
          </DrawerHeader>
          <div className="min-h-0 flex-1 grid gap-4 overflow-y-auto p-5">
            <label className="grid gap-1.5">
              <span className="font-label-caps text-label-caps text-on-surface-variant">
                PROYECTO
              </span>
              <select
                aria-label="Filtrar por proyecto"
                className="field"
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
            </label>
            <label className="grid gap-1.5">
              <span className="font-label-caps text-label-caps text-on-surface-variant">
                ESTADO
              </span>
              <select
                aria-label="Filtrar por estado"
                className="field"
                onChange={(event) =>
                  setTaskStatus(event.target.value as typeof statusFilter)
                }
                value={statusFilter}
              >
                <option value="ACTIVE">Activas</option>
                <option value="COMPLETED">Completadas</option>
                <option value="ALL">Todas</option>
              </select>
            </label>
            <label className="grid gap-1.5">
              <span className="font-label-caps text-label-caps text-on-surface-variant">
                PRIORIDAD
              </span>
              <select
                aria-label="Filtrar por prioridad"
                className="field"
                onChange={(event) =>
                  setTaskPriority(event.target.value as TaskPriority | "ALL")
                }
                value={priority}
              >
                <option value="ALL">Todas</option>
                <option value="URGENT">Urgentes</option>
                <option value="HIGH">Altas</option>
                <option value="NORMAL">Normales</option>
                <option value="LOW">Bajas</option>
              </select>
            </label>
            <label className="grid gap-1.5">
              <span className="font-label-caps text-label-caps text-on-surface-variant">
                ORDENAR POR
              </span>
              <select
                aria-label="Ordenar tareas"
                className="field"
                onChange={(event) =>
                  setTaskSort(event.target.value as typeof sort)
                }
                value={sort}
              >
                <option value="dueDate">Vencimiento</option>
                <option value="priority">Prioridad</option>
                <option value="createdAt">Más recientes</option>
                <option value="title">Título</option>
              </select>
            </label>
            <div className="flex items-center justify-between gap-2 border-t border-outline-variant pt-4">
              <button
                className="rounded-lg border border-outline-variant px-3 py-2 font-label-md text-label-md text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface"
                onClick={clearTaskFilters}
                type="button"
              >
                Limpiar
              </button>
              <DrawerClose asChild>
                <button
                  className="rounded-lg bg-primary px-4 py-2 font-label-md text-label-md font-semibold text-on-primary hover:bg-surface-container-high hover:text-on-surface"
                  type="button"
                >
                  Aplicar filtros
                </button>
              </DrawerClose>
            </div>
          </div>
          </DrawerContent>
        </Drawer>
      )}
      {selection.mode && (
        <div className="shrink-0 border-b border-outline-variant bg-secondary-container/30">
          <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-2 px-container-padding py-2 sm:px-6 lg:px-10">
          <span className="mr-1 font-body-sm text-body-sm font-bold text-on-surface">
            {selection.selectedIds.size}{" "}
            {selection.selectedIds.size === 1
              ? "tarea seleccionada"
              : "tareas seleccionadas"}
          </span>
          <select
            aria-label="Mover selección a proyecto"
            className="field h-8 min-w-0 flex-1 text-xs sm:flex-none"
            disabled={
              selection.selectedIds.size === 0 || mutations.bulkMove.isPending
            }
            onChange={(event) => {
              const value = event.target.value;
              if (!value) return;
              void handleBulkMove(value === "__none__" ? null : value);
            }}
            value=""
          >
            <option value="">Mover a proyecto...</option>
            <option disabled={isBulkMoveNoop(null)} value="__none__">
              Sin proyecto
            </option>
            {allProjects.map((project) => (
              <option
                disabled={isBulkMoveNoop(project.id)}
                key={project.id}
                value={project.id}
              >
                {project.name}
              </option>
            ))}
          </select>
           <button
            aria-label="Eliminar tareas seleccionadas"
            className="flex h-8 items-center gap-1.5 rounded-md border border-outline-variant px-3 font-body-sm text-body-sm text-error hover:bg-error hover:text-error-foreground disabled:opacity-50"
            disabled={selection.selectedIds.size === 0}
            onClick={() => setConfirmBulkDelete(true)}
            type="button"
          >
            <Trash2 size={14} /> Eliminar
          </button>
          <button
            aria-label="Salir del modo selección"
            className="flex h-8 items-center gap-1.5 rounded-md border border-outline-variant px-3 font-body-sm text-body-sm text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface"
            onClick={selection.clear}
            type="button"
          >
            <X size={14} /> Salir
          </button>
          </div>
        </div>
      )}
      <main className="flex flex-none flex-col">
        {query.isLoading ? (
          <div className="mx-auto flex min-h-[24rem] w-full max-w-6xl items-center justify-center p-container-padding font-body-sm text-body-sm text-on-surface-variant sm:px-6 lg:px-10">
            Cargando tus tareas...
          </div>
        ) : query.isError ? (
          <div className="mx-auto flex min-h-[24rem] w-full max-w-6xl items-center justify-center p-container-padding font-body-sm text-body-sm text-error sm:px-6 lg:px-10">
            Ups, no pudimos cargar tus tareas. Inténtalo de nuevo.
          </div>
        ) : (
          <div className="flex flex-col">
            <div className="mx-auto flex w-full max-w-6xl flex-col p-container-padding pb-24 sm:px-6 sm:py-8 lg:px-10">
                {view === "backlog" ? (
                  <BacklogPanel
                    count={backlogCount}
                    onEdit={openEdit}
                    onOpen={openPreview}
                    onStartPomodoro={openFocus}
                    onToggle={(task) => void toggleTask(task)}
                    tasks={tasks}
                    previewedTaskId={previewOpen ? modalUrl.state.taskId : null}
                  />
                ) : (
                  <TaskList
                    onCreateOnDay={(key) => modalUrl.openCreateWithDate(key)}
                    onEdit={openEdit}
                    onOpen={openPreview}
                    onPostponeToday={(task) => void postponeToday(task)}
                    onStartPomodoro={openFocus}
                    onToggle={(task) => void toggleTask(task)}
                    tasks={tasks}
                    previewedTaskId={previewOpen ? modalUrl.state.taskId : null}
                  />
                )}
            </div>
            <div className="mx-auto w-full max-w-6xl px-container-padding sm:px-6 lg:px-10">
              {taskPagination}
            </div>
          </div>
        )}
      </main>
      <div className="sm:hidden">
        <FAB ariaLabel="Nueva tarea" onClick={openCreate} raised={modalOpen || previewOpen} />
      </div>
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
      {previewOpen && taskFromUrl && (
        <TaskPreviewModal
          key={taskFromUrl.id}
          onAddSubtask={async (taskId, title) => {
            await mutations.addSubtask.mutateAsync({ taskId, title });
          }}
           onClose={closeModal}
           onDelete={async (taskId) => {
             await mutations.remove.mutateAsync(taskId);
           }}
           onDeleteSubtask={async (taskId, subtaskId) => {
             await mutations.removeSubtask.mutateAsync({ taskId, subtaskId });
           }}
          onEdit={() => openEdit(taskFromUrl)}
          onStartPomodoro={() => openFocus(taskFromUrl)}
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
          task={taskFromUrl}
        />
      )}
      {modalOpen && (!modalUrl.state.taskId || editingTask) && (
        <TaskModal
          defaultProjectId={taskDefaultProjectId}
          initialForm={initialForm}
          key={
            editingTask
              ? `${editingTask.id}:${modalUrl.state.prefill ?? ""}`
              : (modalUrl.state.prefill ?? "new")
          }
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
          onSave={saveTask}
          task={editingTask}
        />
      )}
    </section>
  );
}

function DesktopTaskFilters({
  allProjects,
  selectedProjectId,
  statusFilter,
  priority,
  sort,
  onProjectChange,
  onStatusChange,
  onPriorityChange,
  onSortChange,
  onClear,
  onClose,
}: {
  allProjects: Project[];
  selectedProjectId: string | null;
  statusFilter: "ACTIVE" | "COMPLETED" | "ALL";
  priority: TaskPriority | "ALL";
  sort: "priority" | "dueDate" | "createdAt" | "title";
  onProjectChange: (projectId: string | null) => void;
  onStatusChange: (value: "ACTIVE" | "COMPLETED" | "ALL") => void;
  onPriorityChange: (value: TaskPriority | "ALL") => void;
  onSortChange: (value: "priority" | "dueDate" | "createdAt" | "title") => void;
  onClear: () => void;
  onClose: () => void;
}) {
  const activeCount =
    (statusFilter !== "ACTIVE" ? 1 : 0)
    + (priority !== "ALL" ? 1 : 0)
    + (selectedProjectId ? 1 : 0)
    + (sort !== "dueDate" ? 1 : 0);

  return (
    <div
      aria-label="Filtros de tareas"
      className="absolute right-0 top-[calc(100%+0.75rem)] z-30 w-[min(31rem,calc(100vw-2rem))] rounded-xl border border-outline-variant bg-surface-container-lowest p-4 text-left shadow-cadence-3"
      role="dialog"
    >
      <div className="flex items-start justify-between gap-4 border-b border-outline-variant pb-3">
        <div>
          <p className="font-label-caps text-label-caps text-on-surface-variant">PERSONALIZA TU VISTA</p>
          <h3 className="mt-1 font-headline-xs text-headline-xs font-semibold text-on-surface">Filtrar tareas</h3>
        </div>
        <button
          aria-label="Cerrar filtros"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface"
          onClick={onClose}
          type="button"
        >
          <X size={17} />
        </button>
      </div>

      <div className="grid gap-4 py-4">
        <FilterGroup label="Proyecto">
          <select
            aria-label="Filtrar por proyecto"
            className="field h-10 w-full"
            onChange={(event) => onProjectChange(event.target.value || null)}
            value={selectedProjectId ?? ""}
          >
            <option value="">Todos los proyectos</option>
            {allProjects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </FilterGroup>

        <FilterGroup label="Estado">
          <div className="flex flex-wrap gap-2">
            <FilterChip active={statusFilter === "ACTIVE"} onClick={() => onStatusChange("ACTIVE")}>Activas</FilterChip>
            <FilterChip active={statusFilter === "COMPLETED"} onClick={() => onStatusChange("COMPLETED")}>Completadas</FilterChip>
            <FilterChip active={statusFilter === "ALL"} onClick={() => onStatusChange("ALL")}>Todas</FilterChip>
          </div>
        </FilterGroup>

        <FilterGroup label="Prioridad">
          <div className="flex flex-wrap gap-2">
            <FilterChip active={priority === "ALL"} onClick={() => onPriorityChange("ALL")}>Todas</FilterChip>
            <FilterChip active={priority === "URGENT"} onClick={() => onPriorityChange("URGENT")}>Urgentes</FilterChip>
            <FilterChip active={priority === "HIGH"} onClick={() => onPriorityChange("HIGH")}>Altas</FilterChip>
            <FilterChip active={priority === "NORMAL"} onClick={() => onPriorityChange("NORMAL")}>Normales</FilterChip>
            <FilterChip active={priority === "LOW"} onClick={() => onPriorityChange("LOW")}>Bajas</FilterChip>
          </div>
        </FilterGroup>

        <FilterGroup label="Ordenar por">
          <div className="flex flex-wrap gap-2">
            <FilterChip active={sort === "dueDate"} onClick={() => onSortChange("dueDate")}>Vencimiento</FilterChip>
            <FilterChip active={sort === "priority"} onClick={() => onSortChange("priority")}>Prioridad</FilterChip>
            <FilterChip active={sort === "createdAt"} onClick={() => onSortChange("createdAt")}>Más recientes</FilterChip>
            <FilterChip active={sort === "title"} onClick={() => onSortChange("title")}>Título</FilterChip>
          </div>
        </FilterGroup>
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-outline-variant pt-3">
        <span className="font-body-sm text-body-sm text-on-surface-variant">
          {activeCount === 0 ? "Vista predeterminada" : `${activeCount} ${activeCount === 1 ? "filtro activo" : "filtros activos"}`}
        </span>
        <div className="flex gap-2">
          <button
            className="rounded-lg px-3 py-2 font-label-md text-label-md text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface"
            onClick={onClear}
            type="button"
          >
            Limpiar
          </button>
          <button
            className="rounded-lg bg-primary px-3.5 py-2 font-label-md text-label-md font-semibold text-on-primary hover:bg-primary-container hover:text-on-primary-container"
            onClick={onClose}
            type="button"
          >
            Listo
          </button>
        </div>
      </div>
    </div>
  );
}

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section className="grid gap-2">
      <h4 className="font-label-caps text-label-caps text-on-surface-variant">{label}</h4>
      {children}
    </section>
  );
}

function FilterChip({ active, children, onClick }: { active: boolean; children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      aria-pressed={active}
      className={`inline-flex min-h-9 max-w-full items-center gap-1.5 rounded-full border px-3 py-1.5 font-label-md text-label-md transition-colors ${active ? "border-secondary bg-secondary-container text-on-secondary-container" : "border-outline-variant bg-surface text-on-surface-variant hover:border-secondary hover:bg-surface-container-low hover:text-secondary"}`}
      onClick={onClick}
      type="button"
    >
      {active && <Check aria-hidden="true" size={13} />}
      {children}
    </button>
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
