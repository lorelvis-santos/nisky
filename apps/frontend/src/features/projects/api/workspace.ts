import { api } from "@/lib/api";
import type { ApiResponse } from "@/types/api.types";
import type { Paginated, ProjectActivity, ProjectResource, ProjectSummary } from "@/types/entities";

export async function fetchProjectSummary(projectId: string) {
  const { data } = await api.get<ApiResponse<ProjectSummary>>(`/projects/${projectId}/summary`);
  return data.data as ProjectSummary;
}

export async function fetchProjectActivity(projectId: string, params: { page?: number; limit?: number } = {}) {
  const { data } = await api.get<ApiResponse<Paginated<ProjectActivity>>>(`/projects/${projectId}/activity`, { params });
  return data.data as Paginated<ProjectActivity>;
}

export async function fetchProjectResources(projectId: string) {
  const { data } = await api.get<ApiResponse<ProjectResource[]>>(`/projects/${projectId}/resources`);
  return data.data as ProjectResource[];
}

export type ProjectResourcePayload = {
  title: string;
  url: string;
  description?: string | null;
};

export async function createProjectResource(projectId: string, payload: ProjectResourcePayload) {
  const { data } = await api.post<ApiResponse<ProjectResource>>(`/projects/${projectId}/resources`, payload);
  return data.data as ProjectResource;
}

export async function deleteProjectResource(projectId: string, resourceId: string) {
  await api.delete(`/projects/${projectId}/resources/${resourceId}`);
}
