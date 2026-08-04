import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createAdminUser, deleteAdminUser, fetchAdminSettings, fetchAdminUsers, updateAdminSettings, updateAdminUser } from "../api/admin.api";
import type { AdminSettings, AdminUsersQuery, CreateAdminUserPayload, UpdateAdminUserPayload } from "@/types/admin";

export function useAdminUsersQuery(params: AdminUsersQuery = {}) {
  const query = { page: 1, limit: 20, ...params };
  return useQuery({ queryKey: ["admin-users", query], queryFn: () => fetchAdminUsers(query) });
}

export function useAdminSettingsQuery() {
  return useQuery({ queryKey: ["admin-settings"], queryFn: fetchAdminSettings });
}

export function useAdminUserMutations() {
  const client = useQueryClient();
  const invalidate = () => client.invalidateQueries({ queryKey: ["admin-users"] });

  const create = useMutation({ mutationFn: (payload: CreateAdminUserPayload) => createAdminUser(payload), onSuccess: invalidate });
  const update = useMutation({ mutationFn: ({ id, payload }: { id: string; payload: UpdateAdminUserPayload }) => updateAdminUser(id, payload), onSuccess: invalidate });
  const remove = useMutation({ mutationFn: deleteAdminUser, onSuccess: invalidate });

  return { create, update, remove };
}

export function useAdminSettingsMutation() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (payload: AdminSettings) => updateAdminSettings(payload),
    onSuccess: () => client.invalidateQueries({ queryKey: ["admin-settings"] }),
  });
}