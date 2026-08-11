import { api } from "@/lib/api";
import type { ApiResponse } from "@/types/api.types";
import type { Comment, Paginated } from "@/types/entities";

export async function listProjectComments(projectId: string, params: { page?: number; limit?: number; order?: "asc" | "desc" } = {}) {
  const { data } = await api.get<ApiResponse<Paginated<Comment>>>(`/projects/${projectId}/comments`, { params });
  return data.data as Paginated<Comment>;
}

export async function listTaskComments(taskId: string, params: { page?: number; limit?: number; order?: "asc" | "desc" } = {}) {
  const { data } = await api.get<ApiResponse<Paginated<Comment>>>(`/tasks/${taskId}/comments`, { params });
  return data.data as Paginated<Comment>;
}

export async function createComment(kind: "project" | "task", id: string, body: string) {
  const endpoint = kind === "project" ? `/projects/${id}/comments` : `/tasks/${id}/comments`;
  const { data } = await api.post<ApiResponse<Comment>>(endpoint, { body });
  return data.data as Comment;
}

export async function updateComment(id: string, body: string) {
  const { data } = await api.patch<ApiResponse<Comment>>(`/comments/${id}`, { body });
  return data.data as Comment;
}

export async function deleteComment(id: string) {
  await api.delete(`/comments/${id}`);
}