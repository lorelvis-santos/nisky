import { api } from "@/lib/api";
import type { Project } from "@/types/entities";

export async function getProjects() {
  const { data } = await api.get<{ data: Project[] }>("/projects");
  return data.data;
}

export type CreateProjectPayload = {
  name: string;
  color?: string;
};

export type UpdateProjectPayload = Partial<CreateProjectPayload>;

export async function createProject(payload: CreateProjectPayload) {
  const { data } = await api.post<{ data: Project }>("/projects", payload);
  return data.data;
}

export async function updateProject(id: string, payload: UpdateProjectPayload) {
  const { data } = await api.patch<{ data: Project }>(`/projects/${id}`, payload);
  return data.data;
}

export async function deleteProject(id: string) {
  const { data } = await api.delete<{ data: { success: boolean; fallbackProjectId: string } }>(`/projects/${id}`);
  return data.data;
}

export async function setDefaultProject(id: string) {
  const { data } = await api.patch<{ data: Project }>(`/projects/${id}/default`);
  return data.data;
}
