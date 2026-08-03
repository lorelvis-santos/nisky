import { api } from "@/lib/api";
import type { ApiResponse } from "@/types/api.types";
import type { AuthResponse } from "@/types/entities";
import type { LoginFormData } from "../schemas/auth.schema";

export async function loginRequest(payload: LoginFormData) {
  const { data } = await api.post<ApiResponse<AuthResponse>>("/auth/login", payload);
  return data.data as AuthResponse;
}
