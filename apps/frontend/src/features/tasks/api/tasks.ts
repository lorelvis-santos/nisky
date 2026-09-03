import { api } from "@/lib/api";
import type { ApiResponse } from "@/types/api.types";
import type { Paginated, Subtask, Task, TaskPriority, TaskStatus } from "@/types/entities";
import type { TaskFormData } from "../schemas/task.schema";

export interface TaskQuery {
  page?: number;
  limit?: number;
  status?: TaskStatus | TaskStatus[];
  priority?: TaskPriority;
  q?: string;
  projectId?: string;
  scheduled?: "ALL" | "PLANNED" | "UNPLANNED";
  sort?: "priority" | "dueDate" | "createdAt" | "title";
  order?: "asc" | "desc";
}

export type TaskPayload = TaskFormData & { status?: TaskStatus };
export type TaskUpdatePayload = Omit<Partial<TaskPayload>, "dueDate"> & { dueDate?: string | null };

export async function fetchTasks(params: TaskQuery = {}) {
  const query = { limit: 20, sort: "priority" as const, order: "desc" as const, ...params };
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined) continue;
    if (Array.isArray(value)) {
      for (const item of value) searchParams.append(key, item);
    } else {
      searchParams.set(key, String(value));
    }
  }
  const { data } = await api.get<ApiResponse<Paginated<Task>>>("/tasks", { params: searchParams });
  return data.data as Paginated<Task>;
}

export async function fetchTask(id: string) {
  const { data } = await api.get<ApiResponse<Task>>(`/tasks/${id}`);
  return data.data as Task;
}

export async function createTask(payload: TaskPayload) {
  const { data } = await api.post<ApiResponse<Task>>("/tasks", payload);
  return data.data as Task;
}

export async function updateTask(id: string, payload: TaskUpdatePayload) {
  const { data } = await api.patch<ApiResponse<Task>>(`/tasks/${id}`, payload);
  return data.data as Task;
}

export async function deleteTask(id: string) {
  await api.delete(`/tasks/${id}`);
}

export async function bulkDeleteTasks(ids: string[]) {
  await api.post("/tasks/bulk-delete", { ids });
}

export async function bulkMoveTasks(ids: string[], projectId: string | null) {
  await api.patch("/tasks/bulk-move", { ids, projectId });
}

export async function reorderTasks(items: { id: string; order: number }[]) {
  await api.patch("/tasks/reorder", { items });
}

export async function createSubtask(taskId: string, title: string) {
  const { data } = await api.post<ApiResponse<Subtask>>(`/tasks/${taskId}/subtasks`, { title });
  return data.data as Subtask;
}

export async function updateSubtask(taskId: string, subtaskId: string, payload: { title?: string; completed?: boolean }) {
  const { data } = await api.patch<ApiResponse<Subtask>>(`/tasks/${taskId}/subtasks/${subtaskId}`, payload);
  return data.data as Subtask;
}

export async function deleteSubtask(taskId: string, subtaskId: string) {
  await api.delete(`/tasks/${taskId}/subtasks/${subtaskId}`);
}
