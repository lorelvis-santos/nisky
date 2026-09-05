import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { bulkDeleteTasks, bulkMoveTasks, createSubtask, createTask, deleteSubtask, deleteTask, fetchTask, fetchTasks, reorderTasks, updateSubtask, updateTask, type TaskQuery, type TaskUpdatePayload } from "../api/tasks";
import { localDateKey } from "@/lib/utils";
import type { Task } from "@/types/entities";

export function useTasksQuery(params: TaskQuery = {}) {
  return useQuery({ queryKey: ["tasks", params], queryFn: () => fetchTasks(params) });
}

type InfiniteTaskParams = Omit<TaskQuery, "page" | "limit">;

export function useInfiniteTasksQuery(params: InfiniteTaskParams = {}, options?: { enabled?: boolean }) {
  return useInfiniteQuery({
    enabled: options?.enabled,
    queryKey: ["tasks", "pages", params],
    initialPageParam: 1,
    queryFn: ({ pageParam }) => fetchTasks({ ...params, page: pageParam, limit: 50 }),
    getNextPageParam: (lastPage) =>
      lastPage.meta.currentPage < lastPage.meta.totalPages
        ? lastPage.meta.currentPage + 1
        : undefined,
  });
}

export function useActiveTasksQuery(params: Omit<InfiniteTaskParams, "status"> = {}, options?: { enabled?: boolean }) {
  return useInfiniteTasksQuery({ ...params, status: ["PENDING", "IN_PROGRESS"] }, options);
}

export function useTaskQuery(id: string | null) {
  return useQuery({ queryKey: ["task", id], queryFn: () => fetchTask(id as string), enabled: Boolean(id) });
}

export function useUnplannedTasksQuery(params: Omit<TaskQuery, "page" | "limit" | "scheduled" | "status"> = {}) {
  return useInfiniteQuery({
    queryKey: ["tasks", "unplanned", params],
    initialPageParam: 1,
    queryFn: ({ pageParam }) => fetchTasks({
      ...params,
      page: pageParam,
      limit: 50,
      scheduled: "UNPLANNED",
      status: ["PENDING", "IN_PROGRESS"],
      sort: "priority",
      order: "desc",
    }),
    getNextPageParam: (lastPage) =>
      lastPage.meta.currentPage < lastPage.meta.totalPages
        ? lastPage.meta.currentPage + 1
        : undefined,
  });
}

export function useTodayTasksQuery() {
  return useTasksQuery({
    status: "PENDING",
    sort: "priority",
    order: "desc",
    limit: 50,
  });
}

export function groupTasksByDueDate(tasks: Task[]) {
  const today = localDateKey(new Date());
  const tomorrow = localDateKey(new Date(Date.now() + 86_400_000));

  const overdue: Task[] = [];
  const todayTasks: Task[] = [];
  const tomorrowTasks: Task[] = [];

  for (const task of tasks) {
    if (!task.dueDate) continue;
    const due = localDateKey(task.dueDate);
    if (due < today) overdue.push(task);
    else if (due === today) todayTasks.push(task);
    else if (due === tomorrow) tomorrowTasks.push(task);
  }

  return { overdue, todayTasks, tomorrowTasks };
}

export interface OverdueDayGroup {
  dateKey: string;
  label: string;
  tasks: Task[];
}

export function groupOverdueByDay(tasks: Task[]): OverdueDayGroup[] {
  const todayKey = localDateKey(new Date());
  const today = new Date(`${todayKey}T00:00:00`).getTime();
  const byDay = new Map<string, Task[]>();

  for (const task of tasks) {
    if (!task.dueDate) continue;
    const dateKey = localDateKey(task.dueDate);
    const list = byDay.get(dateKey) ?? [];
    list.push(task);
    byDay.set(dateKey, list);
  }

  return [...byDay.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([dateKey, dayTasks]) => {
      const diffDays = Math.round((today - new Date(`${dateKey}T00:00:00`).getTime()) / 86_400_000);
      const label = diffDays <= 1 ? "Ayer" : `Hace ${diffDays} días`;
      return { dateKey, label, tasks: dayTasks };
    });
}

export function useTaskMutations() {
  const client = useQueryClient();
  const invalidate = async () => {
    await client.invalidateQueries({ queryKey: ["tasks"] });
    await client.invalidateQueries({ queryKey: ["task"] });
    await client.invalidateQueries({ queryKey: ["home"] });
  };
  const create = useMutation({ mutationFn: createTask, onSuccess: invalidate });
  const update = useMutation({ mutationFn: ({ id, payload }: { id: string; payload: TaskUpdatePayload }) => updateTask(id, payload), onSuccess: invalidate });
  const remove = useMutation({ mutationFn: deleteTask, onSuccess: invalidate });
  const bulkRemove = useMutation({ mutationFn: bulkDeleteTasks, onSuccess: invalidate });
  const bulkMove = useMutation({ mutationFn: ({ ids, projectId }: { ids: string[]; projectId: string | null }) => bulkMoveTasks(ids, projectId), onSuccess: invalidate });
  const reorder = useMutation({ mutationFn: reorderTasks, onSuccess: invalidate });
  const addSubtask = useMutation({ mutationFn: ({ taskId, title }: { taskId: string; title: string }) => createSubtask(taskId, title), onSuccess: invalidate });
  const toggleSubtask = useMutation({ mutationFn: ({ taskId, subtaskId, completed }: { taskId: string; subtaskId: string; completed: boolean }) => updateSubtask(taskId, subtaskId, { completed }), onSuccess: invalidate });
  const removeSubtask = useMutation({ mutationFn: ({ taskId, subtaskId }: { taskId: string; subtaskId: string }) => deleteSubtask(taskId, subtaskId), onSuccess: invalidate });
  return { create, update, remove, bulkRemove, bulkMove, reorder, addSubtask, toggleSubtask, removeSubtask };
}
