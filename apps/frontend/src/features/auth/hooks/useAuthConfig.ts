import { useMutation, useQuery } from "@tanstack/react-query";
import { changePasswordRequest, fetchPublicConfig, type PublicConfig } from "../api/auth";

export function usePublicConfigQuery() {
  return useQuery({ queryKey: ["public-config"], queryFn: fetchPublicConfig, staleTime: 60_000 });
}

export function useChangePassword(onSuccess?: () => void) {
  return useMutation({
    mutationFn: (payload: { currentPassword: string; newPassword: string }) => changePasswordRequest(payload),
    onSuccess,
  });
}

export type { PublicConfig };