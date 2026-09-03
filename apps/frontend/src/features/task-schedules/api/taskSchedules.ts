import { api } from "@/lib/api";
import type { ApiResponse } from "@/types/api.types";
import type { TaskPriority, TaskSchedule, TaskStatus } from "@/types/entities";

export type TaskScheduleQuery = {
  from: string;
  to: string;
  projectId?: string;
  status?: TaskStatus;
};

export type TaskSchedulePayload = {
  date: string;
  timeBlockId?: string | null;
  order?: number;
};

export async function getTaskSchedules(params: TaskScheduleQuery) {
  const { data } = await api.get<ApiResponse<TaskSchedule[]>>("/task-schedules", { params });
  return data.data;
}

export async function saveTaskSchedule(taskId: string, payload: TaskSchedulePayload) {
  const { data } = await api.put<ApiResponse<TaskSchedule>>(`/task-schedules/${taskId}`, payload);
  return data.data as TaskSchedule;
}

export async function removeTaskSchedule(taskId: string) {
  await api.delete(`/task-schedules/${taskId}`);
}

export async function reorderTaskSchedules(date: string, items: { taskId: string; order: number }[]) {
  await api.patch("/task-schedules/reorder", { date, items });
}

export type TaskScheduleFilter = {
  projectId?: string;
  priority?: TaskPriority;
  q?: string;
};
