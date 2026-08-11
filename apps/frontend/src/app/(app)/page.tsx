"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { FAB } from "@/components/ui/FAB";
import { ActiveBlockBanner } from "@/components/home/ActiveBlockBanner";
import { ActivityHeatmap } from "@/components/home/ActivityHeatmap";
import { FutureView } from "@/components/home/FutureView";
import { HomeHabitsMatrix } from "@/components/home/HomeHabitsMatrix";
import { QuickCaptureSheet } from "@/components/home/QuickCaptureSheet";
import { TodayTasksPanel, getTodayUrgentTasks } from "@/components/home/TodayTasksPanel";
import { WeeklyStats } from "@/components/home/WeeklyStats";
import { useHabitMutations } from "@/features/habits/hooks/useHabits";
import { HabitManager } from "@/features/habits/components/HabitManager";
import { useHomeActivityQuery, useHomeOverviewQuery, useHabitsMatrixQuery } from "@/features/home/hooks/useHome";
import { useTaskMutations } from "@/features/tasks/hooks/useTasks";
import type { Task } from "@/types/entities";

export default function DashboardPage() {
  const router = useRouter();
  const [fabOpen, setFabOpen] = useState(false);
  const [habitManagerOpen, setHabitManagerOpen] = useState(false);

  const overviewQuery = useHomeOverviewQuery();
  const activityQuery = useHomeActivityQuery();
  const matrixQuery = useHabitsMatrixQuery();
  const taskMutations = useTaskMutations();
  const habitMutations = useHabitMutations();

  const overview = overviewQuery.data;
  const activeBlock = overview?.activeBlock ?? null;
  const blockTasks = overview?.blockTasks ?? [];
  const blockTaskIds = new Set(blockTasks.map((task) => task.id));
  const urgentTasks = getTodayUrgentTasks(overview?.urgentTasks ?? [], 10).filter(
    (task) => !blockTaskIds.has(task.id),
  );

  const toggleTask = async (task: Task) => {
    try {
      await taskMutations.update.mutateAsync({
        id: task.id,
        payload: { status: task.status === "COMPLETED" ? "PENDING" : "COMPLETED" },
      });
    } catch {
      toast.error("Ups, no pudimos actualizar la tarea.");
    }
  };

  const handlePlayPomodoro = (taskId?: string, projectId?: string) => {
    const params = new URLSearchParams();
    if (taskId) params.set("taskId", taskId);
    if (projectId) params.set("projectId", projectId);
    router.push(params.toString() ? `/focus?${params.toString()}` : "/focus");
  };

  return (
    <section className="flex h-full flex-col bg-background">
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex max-w-5xl flex-col gap-3 p-container-padding pb-20 sm:px-section-gap">
          <ActiveBlockBanner
            block={activeBlock}
            nextBlock={overview?.nextBlock ?? null}
            nextBlockStart={overview?.nextBlockStart ?? null}
            onPlayPomodoro={handlePlayPomodoro}
            onToggleTask={(task) => void toggleTask(task)}
            tasks={overview?.blockTasks ?? []}
          />
          <div className="border border-outline-variant bg-surface-container-lowest">
            <TodayTasksPanel emptyMessage="Nada pendiente. ¡Todo al día!" onToggle={(task) => void toggleTask(task)} tasks={urgentTasks} />
          </div>
          <FutureView blocks={overview?.futureBlocks ?? []} tasks={overview?.futureTasks ?? []} />
          <WeeklyStats weekly={overview?.weekly} />
          <HomeHabitsMatrix
            matrix={matrixQuery.data}
            onOpenManager={() => setHabitManagerOpen(true)}
            onToggle={(habitId, date) => {
              void habitMutations.toggleEntry.mutateAsync({ id: habitId, date });
            }}
          />
          <ActivityHeatmap activity={activityQuery.data} />
        </div>
      </div>

      <div className="lg:hidden">
        <FAB ariaLabel="Nueva nota rápida" onClick={() => setFabOpen(true)} raised={fabOpen} />
        <BottomSheet onClose={() => setFabOpen(false)} open={fabOpen} title="Nota rápida">
          <QuickCaptureSheet onClose={() => setFabOpen(false)} />
        </BottomSheet>
      </div>

      {habitManagerOpen && <HabitManager onClose={() => setHabitManagerOpen(false)} />}
    </section>
  );
}
