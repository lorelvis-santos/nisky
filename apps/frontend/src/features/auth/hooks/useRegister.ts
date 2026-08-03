import { useMutation } from "@tanstack/react-query";
import { registerRequest } from "../api/register";
import type { RegisterFormData } from "../schemas/auth.schema";
import type { ApiError } from "@/types/api.types";
import type { AuthResponse } from "@/types/entities";

export function useRegister(onSuccess: (result: AuthResponse) => void) {
  return useMutation<AuthResponse, ApiError, RegisterFormData>({ mutationFn: registerRequest, onSuccess });
}
