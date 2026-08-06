import axios, { type AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from "axios";
import type { ApiError, ApiResponse } from "@/types/api.types";
import type { AuthResponse } from "@/types/entities";

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "/api/v1";

export const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
  timeout: 15000,
});

let accessToken: string | null = null;
let refreshPromise: Promise<AuthResponse | null> | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

function emit(name: "auth:refreshed" | "auth:logout", detail?: AuthResponse) {
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent(name, { detail }));
}

export async function refreshAccessToken(): Promise<AuthResponse | null> {
  if (refreshPromise) return refreshPromise;
  refreshPromise = (async () => {
    try {
      const response = await axios.post<ApiResponse<AuthResponse>>(`${API_URL}/auth/refresh`, {}, { withCredentials: true, timeout: 15000 });
      const result = response.data.data ?? null;
      setAccessToken(result?.accessToken ?? null);
      if (result) emit("auth:refreshed", result);
      return result;
    } catch {
      setAccessToken(null);
      void axios.post(`${API_URL}/auth/logout`, {}, { withCredentials: true, timeout: 5000 }).catch(() => undefined);
      emit("auth:logout");
      return null;
    } finally {
      refreshPromise = null;
    }
  })();
  return refreshPromise;
}

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  return config;
});

api.interceptors.response.use(
  (response: AxiosResponse<ApiResponse>) => {
    if (response.data.ok === false) return Promise.reject(response.data.error);
    return response;
  },
  async (error: AxiosError<ApiResponse>) => {
    const original = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;
    const url = original?.url ?? "";
    const isRefreshRequest = url.includes("/auth/refresh");

    if (error.response?.status === 401 && original && !original._retry && !isRefreshRequest) {
      original._retry = true;
      const refreshed = await refreshAccessToken();
      if (refreshed) {
        original.headers.Authorization = `Bearer ${refreshed.accessToken}`;
        return api(original);
      }
    }

    if (error.response?.data?.error) return Promise.reject(error.response.data.error);
    const networkError: ApiError = { code: "NETWORK_ERROR", message: error.message || "Error de conexión con el servidor" };
    return Promise.reject(networkError);
  },
);
