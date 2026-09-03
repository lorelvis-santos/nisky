import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getTaskSchedules, removeTaskSchedule, reorderTaskSchedules, saveTaskSchedule, type TaskSchedulePayload, type TaskScheduleQuery } from "../api/taskSchedules";
import type { TaskSchedule } from "@/types/entities";

type SaveVariables = {
  taskId: string;
  payload: TaskSchedulePayload;
  optimisticSchedule?: TaskSchedule;
};

type ScheduleMutationContext = {
  previous: Array<[readonly unknown[], TaskSchedule[] | undefined]>;
};

function queryParams(queryKey: readonly unknown[]) {
  const params = queryKey[1];
  return params && typeof params === "object" ? params as Partial<TaskScheduleQuery> : {};
}

function includesDate(params: Partial<TaskScheduleQuery>, date: string) {
  return (!params.from || date >= params.from) && (!params.to || date <= params.to);
}

function matchesFilters(schedule: TaskSchedule, params: Partial<TaskScheduleQuery>) {
  return (!params.projectId || schedule.task.projectId === params.projectId)
    && (!params.status || schedule.task.status === params.status);
}

function sortSchedules(schedules: TaskSchedule[]) {
  return [...schedules].sort((a, b) =>
    a.date.localeCompare(b.date) || a.order - b.order || a.createdAt.localeCompare(b.createdAt),
  );
}

export function useTaskSchedulesQuery(params: TaskScheduleQuery) {
  return useQuery({
    queryKey: ["task-schedules", params],
    queryFn: () => getTaskSchedules(params),
  });
}

export function useTaskScheduleMutations() {
  const client = useQueryClient();
  const invalidate = async () => {
    await client.invalidateQueries({ queryKey: ["task-schedules"] });
    await client.invalidateQueries({ queryKey: ["tasks"] });
    await client.invalidateQueries({ queryKey: ["home"] });
  };
  const save = useMutation<TaskSchedule, unknown, SaveVariables, ScheduleMutationContext>({
    mutationFn: ({ taskId, payload }) => saveTaskSchedule(taskId, payload),
    onMutate: async ({ taskId, payload, optimisticSchedule }) => {
      await client.cancelQueries({ queryKey: ["task-schedules"] });
      const previous = client.getQueriesData<TaskSchedule[]>({ queryKey: ["task-schedules"] });
      previous.forEach(([queryKey, current]) => {
        if (!current) return;
        const params = queryParams(queryKey);
        const existing = current.find((schedule) => schedule.taskId === taskId);
        const replacement = optimisticSchedule ?? (existing ? {
          ...existing,
          date: payload.date,
          timeBlockId: payload.timeBlockId ?? null,
          order: payload.order ?? existing.order,
        } : null);
        const next = current.filter((schedule) => schedule.taskId !== taskId);
        if (replacement && includesDate(params, replacement.date) && matchesFilters(replacement, params)) {
          next.push(replacement);
        }
        client.setQueryData<TaskSchedule[]>(queryKey, sortSchedules(next));
      });
      return { previous };
    },
    onError: (_error, _variables, context) => {
      context?.previous.forEach(([queryKey, data]) => client.setQueryData(queryKey, data));
    },
    onSettled: invalidate,
  });
  const remove = useMutation<unknown, unknown, string, ScheduleMutationContext>({
    mutationFn: removeTaskSchedule,
    onMutate: async (taskId) => {
      await client.cancelQueries({ queryKey: ["task-schedules"] });
      const previous = client.getQueriesData<TaskSchedule[]>({ queryKey: ["task-schedules"] });
      client.setQueriesData<TaskSchedule[]>({ queryKey: ["task-schedules"] }, (current) =>
        current?.filter((schedule) => schedule.taskId !== taskId),
      );
      return { previous };
    },
    onError: (_error, _taskId, context) => {
      context?.previous.forEach(([queryKey, data]) => client.setQueryData(queryKey, data));
    },
    onSettled: invalidate,
  });
  const reorder = useMutation<unknown, unknown, { date: string; items: { taskId: string; order: number }[] }, ScheduleMutationContext>({
    mutationFn: ({ date, items }: { date: string; items: { taskId: string; order: number }[] }) => reorderTaskSchedules(date, items),
    onMutate: async ({ date, items }) => {
      await client.cancelQueries({ queryKey: ["task-schedules"] });
      const previous = client.getQueriesData<TaskSchedule[]>({ queryKey: ["task-schedules"] });
      const orders = new Map(items.map((item) => [item.taskId, item.order]));
      client.setQueriesData<TaskSchedule[]>({ queryKey: ["task-schedules"] }, (current) =>
        current ? sortSchedules(current.map((schedule) =>
          schedule.date === date && orders.has(schedule.taskId)
            ? { ...schedule, order: orders.get(schedule.taskId)! }
            : schedule,
        )) : current,
      );
      return { previous };
    },
    onError: (_error, _variables, context) => {
      context?.previous.forEach(([queryKey, data]) => client.setQueryData(queryKey, data));
    },
    onSettled: invalidate,
  });
  return { save, remove, reorder };
}
