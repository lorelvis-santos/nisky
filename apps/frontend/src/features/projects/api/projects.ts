import { api } from "@/lib/api";
import type { Project, ProjectInvitation, ProjectMember, ProjectRole, User } from "@/types/entities";

export async function getProjects() {
  const { data } = await api.get<{ data: Project[] }>("/projects");
  return data.data;
}

export async function getProject(id: string) {
  const { data } = await api.get<{ data: Project }>(`/projects/${id}`);
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

export async function leaveProject(id: string) {
  const { data } = await api.post<{ data: { success: boolean } }>(`/projects/${id}/leave`);
  return data.data;
}

export async function setDefaultProject(id: string) {
  const { data } = await api.patch<{ data: Project }>(`/projects/${id}/default`);
  return data.data;
}

export async function getAccessibleProjects() {
  const { data } = await api.get<{ data: Project[] }>("/projects/accessible");
  return data.data;
}

export async function getProjectMembers(projectId: string) {
  const { data } = await api.get<{ data: ProjectMember[] }>(`/projects/${projectId}/members`);
  return data.data;
}

export async function inviteProjectMember(projectId: string, email: string) {
  const { data } = await api.post<{ data: ProjectInvitation }>(`/projects/${projectId}/invitations`, { email });
  return data.data;
}

export async function getPendingInvitations() {
  const { data } = await api.get<{ data: ProjectInvitation[] }>("/projects/invitations/pending");
  return data.data;
}

export async function acceptInvitation(invitationId: string) {
  const { data } = await api.post<{ data: { success: boolean } }>(`/projects/invitations/${invitationId}/accept`);
  return data.data;
}

export async function declineInvitation(invitationId: string) {
  const { data } = await api.post<{ data: { success: boolean } }>(`/projects/invitations/${invitationId}/decline`);
  return data.data;
}

export async function removeProjectMember(projectId: string, memberId: string) {
  const { data } = await api.delete<{ data: ProjectMember }>(`/projects/${projectId}/members/${memberId}`);
  return data.data;
}

export async function updateProjectMemberRole(projectId: string, memberId: string, role: ProjectRole) {
  const { data } = await api.patch<{ data: ProjectMember }>(`/projects/${projectId}/members/${memberId}/role`, { role });
  return data.data;
}

export async function updateProfile(payload: { name: string }) {
  const { data } = await api.patch<{ data: User }>("/user/profile", payload);
  return data.data;
}

export async function uploadAvatar(file: File) {
  const formData = new FormData();
  formData.append("file", file);
  const { data } = await api.post<{ data: User }>("/user/avatar", formData);
  return data.data;
}

export async function removeAvatar() {
  const { data } = await api.delete<{ data: User }>("/user/avatar");
  return data.data;
}
