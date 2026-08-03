import { useMutation } from "@tanstack/react-query";
import { loginRequest } from "../api/login";
import type { LoginFormData } from "../schemas/auth.schema";
import type { ApiError } from "@/types/api.types";
import type { AuthResponse } from "@/types/entities";

export function useLogin(onSuccess: (result: AuthResponse) => void) {
  return useMutation<AuthResponse, ApiError, LoginFormData>({ mutationFn: loginRequest, onSuccess });
}
