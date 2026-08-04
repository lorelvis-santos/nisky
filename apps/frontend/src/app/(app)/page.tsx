"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Circle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthProvider";
import { HabitManager } from "@/features/habits/components/HabitManager";
import { HabitRow } from "@/features/habits/components/HabitRow";
import { useHabitMutations, useHabitsQuery } from "@/features/habits/hooks/useHabits";
import { QuickCapture } from "@/features/quicknotes/components/QuickCapture";
import type { DetectedDate } from "@/features/quicknotes/utils/detectDate";
import { PriorityChip } from "@/features/tasks/components/PriorityChip";
import { useTaskMutations, useTasksQuery } from "@/features/tasks/hooks/useTasks";
import { formatRelativeDate, isTaskOverdue } from "@/lib/utils";
import type { QuickNote, Task } from "@/types/entities";

function localDateKey() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [habitManagerOpen, setHabitManagerOpen] = useState(false);
  const tasksQuery = useTasksQuery({ limit: 100, sort: "priority", order: "desc" });
  const taskMutations = useTaskMutations();
  const habitsQuery = useHabitsQuery();
  const habitMutations = useHabitMutations();
  const tasks = (tasksQuery.data?.data ?? [])
    .filter((task) => task.status !== "COMPLETED" && task.status !== "CANCELLED")
    .slice(0, 8);
  const today = new Date().toLocaleDateString("es-CO", { day: "2-digit", month: "long", year: "numeric" });
  const todayKey = localDateKey();

  const toggleTask = async (task: Task) => {
    try {
      await taskMutations.update.mutateAsync({ id: task.id, payload: { status: task.status === "COMPLETED" ? "PENDING" : "COMPLETED" } });
    } catch {
      toast.error("No se pudo actualizar la tarea");
    }
  };

  const convertToTask = (note: QuickNote, detected: DetectedDate | null) => {
    const prefill = encodeURIComponent(JSON.stringify({ title: note.content, dueDate: detected?.isoDate ?? "" }));
    router.push(`/tasks?modal=create&prefill=${prefill}&quickNoteId=${encodeURIComponent(note.id)}`);
  };

  return (
    <section className="h-full overflow-y-auto bg-background p-container-padding sm:p-section-gap">
      <div className="mx-auto flex max-w-7xl flex-col gap-section-gap">
        <div className="flex flex-col gap-1 border-b border-outline-variant pb-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="font-label-caps text-label-caps uppercase text-on-surface-variant">PANEL DE OPERACIONES</p>
            <h1 className="mt-1 font-headline-sm text-headline-sm text-primary">Hola, {user?.name ?? "usuario"}</h1>
          </div>
        </div>

        <div className="grid grid-cols-1 items-start gap-section-gap lg:grid-cols-12">
          <section className="lg:col-span-8">
            <div className="border border-outline-variant bg-surface-container-lowest">
              <div className="flex items-center justify-between border-b border-outline-variant bg-surface-container-low p-container-padding">
                <div><p className="font-label-caps text-label-caps uppercase text-on-surface-variant">Hoy</p><h2 className="mt-1 font-headline-xs text-headline-xs">{today}</h2></div>
                <Link className="flex items-center gap-1 font-label-caps text-label-caps text-primary hover:text-primary-container" href="/tasks">VER TODAS <ArrowRight size={14} /></Link>
              </div>
              <div>
                {tasksQuery.isLoading ? <p className="p-container-padding font-body-sm text-body-sm text-on-surface-variant">Cargando tareas...</p> : tasksQuery.isError ? (
                  <div className="flex flex-col gap-3 p-container-padding"><p className="font-body-sm text-body-sm text-error">No se pudieron cargar las tareas.</p><Link className="font-body-sm text-body-sm text-primary underline" href="/tasks">Abrir planificación</Link></div>
                ) : tasks.length === 0 ? (
                  <div className="flex flex-col gap-2 p-container-padding"><p className="font-body-md text-body-md">No hay tareas activas.</p><Link className="font-body-sm text-body-sm text-primary underline" href="/tasks">Crear una tarea</Link></div>
                ) : tasks.map((task) => <DashboardTask key={task.id} onToggle={() => void toggleTask(task)} task={task} />)}
              </div>
            </div>
          </section>

          <section className="flex flex-col gap-section-gap lg:col-span-4">
            <div className="border border-outline-variant bg-surface-container-lowest">
              <div className="flex items-center justify-between border-b border-outline-variant bg-surface-container-low p-container-padding">
                <h2 className="font-headline-xs text-headline-xs">Registro de hábitos</h2>
                <button className="font-label-caps text-label-caps text-primary hover:underline" onClick={() => setHabitManagerOpen(true)} type="button">EDITAR</button>
              </div>
              <div className="flex flex-col gap-1 p-2">
                {habitsQuery.isLoading ? <p className="p-2 font-body-sm text-body-sm text-on-surface-variant">Cargando hábitos...</p> : habitsQuery.isError ? <p className="p-2 font-body-sm text-body-sm text-error">No se pudieron cargar los hábitos.</p> : (habitsQuery.data ?? []).length === 0 ? (
                  <div className="flex flex-col gap-2 p-2"><p className="font-body-sm text-body-sm text-on-surface-variant">No tienes hábitos configurados.</p><button className="self-start font-body-sm text-body-sm text-primary underline" onClick={() => setHabitManagerOpen(true)} type="button">Crear hábito</button></div>
                ) : (habitsQuery.data ?? []).map((habit) => <HabitRow key={habit.id} habit={habit} onToggle={() => void habitMutations.toggleEntry.mutateAsync({ id: habit.id, date: todayKey })} />)}
              </div>
            </div>

            <div className="flex min-h-[250px] flex-col border border-outline-variant bg-surface-container-lowest">
              <div className="border-b border-outline-variant bg-surface-container-low p-container-padding"><h2 className="font-headline-xs text-headline-xs">Captura rápida</h2></div>
              <QuickCapture onConvertToTask={convertToTask} />
            </div>
          </section>
        </div>
      </div>
      {habitManagerOpen && <HabitManager onClose={() => setHabitManagerOpen(false)} />}
    </section>
  );
}

function DashboardTask({ task, onToggle }: { task: Task; onToggle: () => void }) {
  const overdue = isTaskOverdue(task);
  return (
    <div className={`group flex items-start justify-between gap-3 border-b border-outline-variant px-4 py-3 transition-colors last:border-b-0 hover:bg-surface-container-low ${overdue ? "border-l-2 border-l-error" : ""}`}>
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <button aria-label={`Completar ${task.title}`} className="mt-0.5 shrink-0 text-outline hover:text-primary" onClick={onToggle} type="button"><Circle size={18} /></button>
        <div className="min-w-0">
          <Link className="block line-clamp-2 break-words font-body-md text-body-md font-medium hover:text-primary" href={`/tasks?taskId=${encodeURIComponent(task.id)}`}>{task.title}</Link>
          {task.dueDate && <p className={`mt-1 font-data-mono text-data-mono text-xs ${overdue ? "text-error" : "text-on-surface-variant"}`}>{overdue ? "Vencida: " : "Vence "}{formatRelativeDate(task.dueDate, true)}</p>}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2"><PriorityChip priority={task.priority} /><Link aria-label={`Ver detalle de ${task.title}`} className="flex h-7 w-7 items-center justify-center border border-outline-variant text-on-surface-variant hover:border-outline hover:bg-surface-container-high hover:text-primary" href={`/tasks?taskId=${encodeURIComponent(task.id)}`} title="Ver detalle"><ArrowRight size={15} /></Link></div>
    </div>
  );
}
