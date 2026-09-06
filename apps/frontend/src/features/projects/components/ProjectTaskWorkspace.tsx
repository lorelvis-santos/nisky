"use client";

import { Check, CheckCircle2, Circle, Filter, MoreHorizontal, Pencil, Play, Plus, RefreshCw, Search, SlidersHorizontal } from "lucide-react";
import { useRef, useState } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { PriorityChip } from "@/features/tasks/components/PriorityChip";
import { TaskPagination } from "@/features/tasks/components/TaskPagination";
import type { PaginationMeta, ProjectMember, Task, TaskPriority } from "@/types/entities";
import { cn, isTaskOverdue } from "@/lib/utils";
import { formatTaskDueDate } from "@/features/tasks/lib/task-utils";

export type ProjectTaskMode = "ACTIVE" | "MINE" | "ALL";

const statusLabels: Record<Task["status"], string> = {
  PENDING: "Pendiente",
  IN_PROGRESS: "En progreso",
  COMPLETED: "Completada",
  CANCELLED: "Cancelada",
};

const statusStyles: Record<Task["status"], string> = {
  PENDING: "bg-surface-container-low text-on-surface-variant",
  IN_PROGRESS: "bg-info-container text-on-info-container",
  COMPLETED: "bg-tertiary-container text-on-tertiary-container",
  CANCELLED: "bg-surface-container-high text-on-surface-variant",
};

function isClosedTask(task: Task) {
  return task.status === "COMPLETED" || task.status === "CANCELLED";
}

function projectTaskOrderGroup(task: Task) {
  if (!isClosedTask(task) && isTaskOverdue(task)) return 0;
  if (!isClosedTask(task) && task.dueDate) return 1;
  if (!isClosedTask(task)) return 2;
  if (task.dueDate) return 3;
  return 4;
}

function compareProjectTasks(a: Task, b: Task) {
  return projectTaskOrderGroup(a) - projectTaskOrderGroup(b)
    || (a.dueDate ?? "").localeCompare(b.dueDate ?? "")
    || a.order - b.order
    || a.createdAt.localeCompare(b.createdAt);
}

export function ProjectTaskWorkspace({
  tasks,
  members,
  meta,
  isLoading,
  isError,
  isFetching,
  mode,
  search,
  priority,
  assigneeId,
  onModeChange,
  onSearchChange,
  onPriorityChange,
  onAssigneeChange,
  onResetFilters,
  onRetry,
  onOpen,
  onEdit,
  previewedTaskId,
  onToggle,
  onStartPomodoro,
  onPageChange,
  onCreateTask,
  onQuickAdd,
}: {
  tasks: Task[];
  members: ProjectMember[];
  meta?: PaginationMeta;
  isLoading: boolean;
  isError: boolean;
  isFetching: boolean;
  mode: ProjectTaskMode;
  search: string;
  priority: TaskPriority | "ALL";
  assigneeId: string;
  onModeChange: (mode: ProjectTaskMode) => void;
  onSearchChange: (value: string) => void;
  onPriorityChange: (value: TaskPriority | "ALL") => void;
  onAssigneeChange: (value: string) => void;
  onResetFilters: () => void;
  onRetry: () => void;
  onOpen: (task: Task) => void;
  onEdit: (task: Task) => void;
  previewedTaskId?: string | null;
  onToggle: (task: Task) => void;
  onStartPomodoro: (task: Task) => void;
  onPageChange: (page: number) => void;
  onCreateTask: () => void;
  onQuickAdd: (title: string) => Promise<void>;
}) {
  const quickAddRef = useRef<HTMLInputElement>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [quickTitle, setQuickTitle] = useState("");
  const hasAdvancedFilters = priority !== "ALL" || Boolean(assigneeId);
  const orderedTasks = [...tasks].sort(compareProjectTasks);

  const submitQuickAdd = async () => {
    const title = quickTitle.trim();
    if (!title) return;
    try {
      await onQuickAdd(title);
      setQuickTitle("");
      requestAnimationFrame(() => quickAddRef.current?.focus());
    } catch {
      // The mutation handler already reports the error and keeps the draft visible.
    }
  };

  return (
    <section className="min-w-0">
        <div className="mb-4 flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-1.5">
            {(["ACTIVE", "MINE", "ALL"] as const).map((value) => (
               <button className={cn("min-h-9 rounded-full border px-3.5 text-[12px] font-semibold transition-colors", mode === value ? "border-[#1e3a5f] bg-[#1e3a5f] text-white" : "border-[#dde1e2] bg-white text-[#5f6872] hover:border-[#b8c0c4] hover:text-[#1e3a5f]")} key={value} onClick={() => onModeChange(value)} type="button">
                {value === "ALL" ? "Todas" : value === "MINE" ? "Mis tareas" : "Activas"}
              </button>
            ))}
            {isFetching && <span className="ml-1 text-[11px] text-[#8a95a8]">Actualizando...</span>}
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <label className="relative min-w-0 flex-1">
               <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#858d91]" size={16} />
              <span className="sr-only">Buscar tareas del proyecto</span>
               <input aria-label="Buscar tareas del proyecto" className="h-10 w-full rounded-sm border border-[#dde1e2] bg-white pl-9 pr-3 text-[13px] text-[#1f2933] outline-none placeholder:text-[#9aa2a5] focus:border-[#1e3a5f]" onChange={(event) => onSearchChange(event.target.value)} placeholder="Buscar tareas..." type="search" value={search} />
            </label>
            <div className="flex items-center gap-2">
              <div className="relative">
                 <button aria-expanded={filtersOpen} className={cn("flex h-10 items-center gap-1.5 rounded-md border bg-white px-3 text-[13px] font-semibold transition-colors", filtersOpen || hasAdvancedFilters ? "border-[#1e3a5f] text-[#1e3a5f]" : "border-[#dde1e2] text-[#5f6872] hover:border-[#b8c0c4] hover:text-[#1e3a5f]")} onClick={() => setFiltersOpen((open) => !open)} type="button">
                    <SlidersHorizontal size={15} /> Filtros {hasAdvancedFilters && <span className="h-1.5 w-1.5 rounded-full bg-[#1e3a5f]" />}
                 </button>
                 {filtersOpen && <AdvancedFilters assigneeId={assigneeId} members={members} onAssigneeChange={onAssigneeChange} onClose={() => setFiltersOpen(false)} onPriorityChange={onPriorityChange} priority={priority} onReset={onResetFilters} />}
               </div>
               <button className="hidden h-10 shrink-0 items-center gap-1.5 rounded-md bg-[#1e3a5f] px-3.5 text-[13px] font-semibold text-white shadow-[0_2px_6px_rgba(30,58,95,0.18)] hover:bg-[#152c48] sm:inline-flex" onClick={onCreateTask} type="button">
                 <Plus size={16} /> Nueva tarea
               </button>
              </div>
           </div>
        </div>

        <div className="project-panel overflow-visible">
           <div className="hidden rounded-t-lg grid-cols-[44px_minmax(0,1fr)_7.25rem_6.5rem_7.5rem_7rem_2.75rem] items-center gap-2 border-b border-[#e7e9e8] bg-[#fafaf8] px-3 py-3 text-[10px] font-bold uppercase tracking-[0.08em] text-[#858d91] md:grid lg:px-4">
            <span />
            <span>Tarea</span>
            <span>Estado</span>
            <span>Prioridad</span>
            <span>Entrega</span>
            <span>Responsable</span>
            <span />
          </div>
           {isLoading ? <TaskSkeleton /> : isError ? <TaskError onRetry={onRetry} /> : tasks.length === 0 ? <TaskEmpty hasFilters={mode === "MINE" || Boolean(search) || hasAdvancedFilters} mode={mode} onReset={onResetFilters} /> : (
             <>
               <div className="divide-y divide-[#e7e9e8]">
                   {orderedTasks.map((task) => <ProjectTaskRow isPreviewed={previewedTaskId === task.id} key={task.id} onEdit={() => onEdit(task)} onOpen={() => onOpen(task)} onStartPomodoro={() => onStartPomodoro(task)} onToggle={() => onToggle(task)} task={task} />)}
              </div>
              {meta && <TaskPagination isFetching={isFetching} meta={meta} onPageChange={onPageChange} />}
            </>
          )}
          <QuickAddInput inputRef={quickAddRef} onChange={setQuickTitle} onSubmit={() => void submitQuickAdd()} value={quickTitle} />
        </div>
    </section>
  );
}

function AdvancedFilters({ assigneeId, members, priority, onAssigneeChange, onPriorityChange, onClose, onReset }: { assigneeId: string; members: ProjectMember[]; priority: TaskPriority | "ALL"; onAssigneeChange: (value: string) => void; onPriorityChange: (value: TaskPriority | "ALL") => void; onClose: () => void; onReset: () => void }) {
  return (
    <div className="absolute right-0 top-12 z-30 w-[min(19rem,calc(100vw-2.5rem))] rounded-lg border border-[#dde1e2] bg-white p-4 shadow-[0_12px_32px_rgba(31,41,51,0.12)]">
      <div className="flex items-center justify-between gap-3"><p className="text-[13px] font-semibold text-[#1f2933]">Filtros avanzados</p><Filter className="text-[#778186]" size={15} /></div>
      <label className="mt-4 block"><span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#858d91]">Prioridad</span><select aria-label="Filtrar por prioridad" className="mt-1 h-10 w-full rounded-sm border border-[#dde1e2] bg-white px-3 text-[13px] text-[#2f3b45] outline-none focus:border-[#1e3a5f]" onChange={(event) => onPriorityChange(event.target.value as TaskPriority | "ALL")} value={priority}><option value="ALL">Todas las prioridades</option><option value="URGENT">Urgente</option><option value="HIGH">Alta</option><option value="NORMAL">Normal</option><option value="LOW">Baja</option></select></label>
      <label className="mt-3 block"><span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#858d91]">Asignado</span><select aria-label="Filtrar por asignado" className="mt-1 h-10 w-full rounded-sm border border-[#dde1e2] bg-white px-3 text-[13px] text-[#2f3b45] outline-none focus:border-[#1e3a5f]" onChange={(event) => onAssigneeChange(event.target.value)} value={assigneeId}><option value="">Todas las personas</option><option value="__unassigned__">Sin asignar</option>{members.map((member) => <option key={member.userId} value={member.userId}>{member.user.name ?? member.user.email}</option>)}</select></label>
      <div className="mt-4 flex justify-between gap-2 border-t border-[#e7e9e8] pt-3"><button className="rounded-md px-2 py-1 text-[12px] font-semibold text-[#5f6872] hover:bg-[#eff1f0] hover:text-[#1e3a5f]" onClick={onReset} type="button">Limpiar</button><button className="rounded-md bg-[#1e3a5f] px-3 py-2 text-[12px] font-semibold text-white hover:bg-[#152c48]" onClick={onClose} type="button">Aplicar</button></div>
    </div>
  );
}

function ProjectTaskRow({ task, onOpen, onEdit, onToggle, onStartPomodoro, isPreviewed }: { task: Task; onOpen: () => void; onEdit: () => void; onToggle: () => void; onStartPomodoro: () => void; isPreviewed?: boolean }) {
  const completed = task.status === "COMPLETED";
  const overdue = isTaskOverdue(task);
  return (
    <article aria-current={isPreviewed ? "true" : undefined} className={cn("first:rounded-t-lg last:rounded-b-lg grid grid-cols-[44px_minmax(0,1fr)] gap-2 px-2 py-2 transition-colors hover:bg-[#fafaf8] sm:px-3 md:grid-cols-[44px_minmax(0,1fr)_7.25rem_6.5rem_7.5rem_7rem_2.75rem] md:items-center lg:px-4", completed && "bg-[#fdfdfb]", isPreviewed && "bg-[#f0f5ff] ring-1 ring-inset ring-[#3b82f6]")}>
      <button aria-label={completed ? "Marcar tarea como pendiente" : "Marcar tarea como completada"} className="flex h-11 w-11 items-center justify-center rounded-full text-[#9aa2a5] hover:bg-[#e7e9e8] hover:text-[#1e3a5f]" onClick={onToggle} type="button">{completed ? <CheckCircle2 className="text-[#4a7c59]" size={20} /> : <Circle size={20} />}</button>
      <div className="flex min-w-0 items-start gap-2 md:hidden">
         <button className="min-w-0 flex-1 rounded-md text-left" onClick={onOpen} type="button">
           <span className={cn("block truncate text-[13px] font-medium text-[#2f3b45]", completed && "text-[#858d91] line-through")}>{task.title}</span>
           <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-[#858d91]">
            <StatusBadge status={task.status} />
            <PriorityChip priority={task.priority} />
             {task.dueDate && <span className={overdue ? "font-semibold text-[#c73b52]" : undefined}>{formatTaskDueDate(task.dueDate)}</span>}
            {task.assignee ? <span className="inline-flex min-w-0 items-center gap-1.5"><Avatar avatarUrl={task.assignee.avatarUrl} email={task.assignee.email} name={task.assignee.name} size="xs" /><span className="max-w-[8rem] truncate">{task.assignee.name ?? task.assignee.email}</span></span> : <span>Sin asignar</span>}
          </span>
        </button>
         <TaskRowActions taskTitle={task.title} onEdit={onEdit} onOpen={onOpen} onStartPomodoro={onStartPomodoro} />
      </div>
       <button className="hidden min-w-0 rounded-md text-left md:block" onClick={onOpen} type="button"><span className={cn("block truncate text-[13px] font-medium text-[#2f3b45]", completed && "text-[#858d91] line-through")}>{task.title}</span></button>
      <span className="hidden md:inline-flex"><StatusBadge status={task.status} /></span>
      <span className="hidden md:inline-flex"><PriorityChip priority={task.priority} /></span>
        <span className={cn("hidden items-center gap-1 text-[11px] md:flex", overdue ? "font-semibold text-[#c73b52]" : "text-[#5f6872]")}>{task.dueDate ? <>{formatTaskDueDate(task.dueDate)}</> : <span className="text-[#9aa2a5]">Sin fecha</span>}</span>
       <span className="hidden min-w-0 items-center gap-1.5 md:flex">{task.assignee ? <><Avatar avatarUrl={task.assignee.avatarUrl} email={task.assignee.email} name={task.assignee.name} size="xs" /><span className="truncate text-[11px] text-[#5f6872]">{task.assignee.name ?? task.assignee.email}</span></> : <span className="text-[11px] text-[#9aa2a5]">Sin asignar</span>}</span>
       <div className="hidden justify-end md:flex"><TaskRowActions taskTitle={task.title} onEdit={onEdit} onOpen={onOpen} onStartPomodoro={onStartPomodoro} /></div>
    </article>
  );
}

function TaskRowActions({ taskTitle, onOpen, onEdit, onStartPomodoro }: { taskTitle: string; onOpen: () => void; onEdit: () => void; onStartPomodoro: () => void }) {
  const [open, setOpen] = useState(false);
  return <div className="relative flex shrink-0 justify-end"><button aria-expanded={open} aria-haspopup="menu" aria-label={`Acciones de ${taskTitle}`} className="flex h-11 w-11 items-center justify-center rounded-md text-[#858d91] hover:bg-[#e7e9e8] hover:text-[#1e3a5f]" onClick={() => setOpen((value) => !value)} type="button"><MoreHorizontal size={17} /></button>{open && <><button aria-label="Cerrar acciones" className="fixed inset-0 z-20 cursor-default" onClick={() => setOpen(false)} type="button" /><div className="absolute right-0 top-12 z-30 w-48 rounded-lg border border-[#dde1e2] bg-white p-1.5 shadow-[0_12px_32px_rgba(31,41,51,0.12)]" role="menu"><button className="flex min-h-10 w-full items-center gap-2 rounded-md px-3 text-left text-[13px] text-[#4f5a63] hover:bg-[#eff1f0] hover:text-[#1e3a5f]" onClick={() => { setOpen(false); onOpen(); }} role="menuitem" type="button">Ver tarea</button><button className="flex min-h-10 w-full items-center gap-2 rounded-md px-3 text-left text-[13px] text-[#4f5a63] hover:bg-[#eff1f0] hover:text-[#1e3a5f]" onClick={() => { setOpen(false); onEdit(); }} role="menuitem" type="button"><Pencil size={14} /> Editar tarea</button><button className="flex min-h-10 w-full items-center gap-2 rounded-md px-3 text-left text-[13px] text-[#4f5a63] hover:bg-[#eff1f0] hover:text-[#1e3a5f]" onClick={() => { setOpen(false); onStartPomodoro(); }} role="menuitem" type="button"><Play size={14} /> Iniciar Pomodoro</button></div></>}</div>;
}

function StatusBadge({ status }: { status: Task["status"] }) {
  return <span className={cn("inline-flex w-fit rounded-full px-2 py-1 text-[10px] font-semibold", statusStyles[status])}>{statusLabels[status]}</span>;
}

function QuickAddInput({ inputRef, value, onChange, onSubmit }: { inputRef: React.RefObject<HTMLInputElement | null>; value: string; onChange: (value: string) => void; onSubmit: () => void }) {
  return <form className="flex items-center gap-2 rounded-b-lg border-t border-[#e7e9e8] bg-[#fafaf8] px-3 py-2.5 sm:px-4" onSubmit={(event) => { event.preventDefault(); onSubmit(); }}><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#e7e9e8] text-[#1e3a5f]"><Plus size={15} /></span><input aria-label="Añadir tarea rápida" className="h-10 min-w-0 flex-1 bg-transparent text-[13px] text-[#2f3b45] outline-none placeholder:text-[#9aa2a5]" onChange={(event) => onChange(event.target.value)} placeholder="Añadir una tarea rápida..." ref={inputRef} value={value} /><button aria-label="Crear tarea rápida" className="flex h-9 w-9 items-center justify-center rounded-md text-[#1e3a5f] hover:bg-[#e7e9e8] disabled:opacity-40" disabled={!value.trim()} type="submit"><Check size={16} /></button></form>;
}

function TaskSkeleton() {
   return <div className="divide-y divide-[#e7e9e8]">{[0, 1, 2, 3].map((row) => <div className="flex h-[4.25rem] items-center gap-3 px-4" key={row}><span className="h-5 w-5 animate-pulse rounded-full bg-[#e7e9e8]" /><span className="h-3 w-1/2 animate-pulse rounded-sm bg-[#e7e9e8]" /></div>)}</div>;
}

function TaskError({ onRetry }: { onRetry: () => void }) {
  return <div className="flex min-h-64 flex-col items-center justify-center gap-3 px-4 text-center"><RefreshCw className="text-[#c73b52]" size={22} /><p className="text-[13px] text-[#5f6872]">No pudimos cargar las tareas del proyecto.</p><button className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-[#dde1e2] px-3 text-[13px] font-semibold text-[#1e3a5f] hover:bg-[#eff1f0]" onClick={onRetry} type="button"><RefreshCw size={14} /> Reintentar</button></div>;
}

function TaskEmpty({ hasFilters, mode, onReset }: { hasFilters: boolean; mode: ProjectTaskMode; onReset: () => void }) {
  const title = hasFilters ? "No hay tareas con estos filtros." : mode === "ACTIVE" ? "No hay tareas activas en este proyecto." : mode === "MINE" ? "No tienes tareas asignadas." : "Todavía no hay tareas en este proyecto.";
  const description = hasFilters ? "Prueba otra combinación o limpia los filtros." : mode === "ACTIVE" ? "Las tareas completadas siguen disponibles en Todas." : mode === "MINE" ? "Crea una tarea o revisa la vista Todas." : "Crea la primera tarea desde la entrada rápida.";
  return <div className="flex min-h-64 flex-col items-center justify-center gap-2 px-4 text-center"><Circle className="text-[#1e3a5f]" size={23} /><p className="mt-1 text-[13px] font-medium text-[#2f3b45]">{title}</p><p className="text-[12px] text-[#5f6872]">{description}</p>{hasFilters && <button className="mt-2 rounded-lg border border-[#dde1e2] px-3 py-2 text-[12px] font-semibold text-[#1e3a5f] hover:bg-[#eff1f0]" onClick={onReset} type="button">Limpiar filtros</button>}</div>;
}
