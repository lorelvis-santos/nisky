import { api } from "@/lib/api";
import type { ApiResponse } from "@/types/api.types";
import type { TaskReference } from "@/types/entities";

export type TaskReferencePayload = {
  title?: string | null;
  url: string;
};

export type TaskReferenceUpdatePayload = Partial<TaskReferencePayload>;

export async function fetchTaskReferences(taskId: string) {
  const { data } = await api.get<ApiResponse<TaskReference[]>>(`/tasks/${taskId}/references`);
  return data.data as TaskReference[];
}

export async function createTaskReference(taskId: string, payload: TaskReferencePayload) {
  const { data } = await api.post<ApiResponse<TaskReference>>(`/tasks/${taskId}/references`, payload);
  return data.data as TaskReference;
}

export async function updateTaskReference(taskId: string, referenceId: string, payload: TaskReferenceUpdatePayload) {
  const { data } = await api.patch<ApiResponse<TaskReference>>(`/tasks/${taskId}/references/${referenceId}`, payload);
  return data.data as TaskReference;
}

export async function deleteTaskReference(taskId: string, referenceId: string) {
  await api.delete(`/tasks/${taskId}/references/${referenceId}`);
}

export async function reorderTaskReferences(taskId: string, items: { id: string; order: number }[]) {
  const { data } = await api.patch<ApiResponse<TaskReference[]>>(`/tasks/${taskId}/references/reorder`, { items });
  return data.data as TaskReference[];
}
