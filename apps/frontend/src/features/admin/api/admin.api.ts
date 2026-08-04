import { api } from "@/lib/api";
import type { AdminSettings, AdminUsersQuery, CreateAdminUserPayload, UpdateAdminUserPayload, UserAdmin } from "@/types/admin";
import type { ApiResponse } from "@/types/api.types";
import type { Paginated } from "@/types/entities";

export async function fetchAdminUsers(params: AdminUsersQuery = {}) {
  const { data } = await api.get<ApiResponse<Paginated<UserAdmin>>>("/admin/users", { params: { page: 1, limit: 20, ...params } });
  return data.data as Paginated<UserAdmin>;
}

export async function createAdminUser(payload: CreateAdminUserPayload) {
  const { data } = await api.post<ApiResponse<UserAdmin>>("/admin/users", payload);
  return data.data as UserAdmin;
}

export async function updateAdminUser(id: string, payload: UpdateAdminUserPayload) {
  const { data } = await api.patch<ApiResponse<UserAdmin>>(`/admin/users/${id}`, payload);
  return data.data as UserAdmin;
}

export async function deleteAdminUser(id: string) {
  await api.delete(`/admin/users/${id}`);
}

export async function fetchAdminSettings() {
  const { data } = await api.get<ApiResponse<AdminSettings>>("/admin/settings");
  return data.data as AdminSettings;
}

export async function updateAdminSettings(payload: AdminSettings) {
  const { data } = await api.patch<ApiResponse<AdminSettings>>("/admin/settings", payload);
  return data.data as AdminSettings;
}