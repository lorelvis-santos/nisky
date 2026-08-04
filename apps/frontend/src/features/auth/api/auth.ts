import { api } from "@/lib/api";
import type { ApiResponse } from "@/types/api.types";

export interface PublicConfig {
  publicSignup: boolean;
}

export async function fetchPublicConfig() {
  const { data } = await api.get<ApiResponse<PublicConfig>>("/auth/config");
  return data.data as PublicConfig;
}

export async function changePasswordRequest(payload: { currentPassword: string; newPassword: string }) {
  await api.patch("/auth/password", payload);
}