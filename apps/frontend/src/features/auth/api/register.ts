import { api } from "@/lib/api";
import type { ApiResponse } from "@/types/api.types";
import type { AuthResponse } from "@/types/entities";
import type { RegisterFormData } from "../schemas/auth.schema";

export async function registerRequest(payload: RegisterFormData) {
  const { data } = await api.post<ApiResponse<AuthResponse>>("/auth/register", payload);
  return data.data as AuthResponse;
}
