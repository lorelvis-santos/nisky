import { api } from "@/lib/api";
import type { ApiResponse } from "@/types/api.types";

export interface Pat {
  id: string;
  name: string;
  prefix: string;
  lastUsedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
}

export interface PatCreated extends Pat {
  raw: string;
}

export async function listPats() {
  const { data } = await api.get<ApiResponse<Pat[]>>("/auth/pat");
  return data.data ?? [];
}

export async function createPat(payload: { name: string; expiresInDays?: number }) {
  const { data } = await api.post<ApiResponse<PatCreated>>("/auth/pat", payload);
  return data.data as PatCreated;
}

export async function revokePat(id: string) {
  const { data } = await api.delete<ApiResponse<{ success: boolean }>>(`/auth/pat/${id}`);
  return data.data as { success: boolean };
}