import { api } from "@/lib/api";
import type { ApiResponse } from "@/types/api.types";
import type { Paginated, PomodoroSession, PomodoroSettings, PomodoroStats, PomodoroPhase, PomodoroSessionStatus } from "@/types/entities";

export interface SessionQuery {
  page?: number;
  limit?: number;
  phase?: PomodoroPhase;
  status?: PomodoroSessionStatus;
  taskId?: string;
}

export interface StartSessionPayload {
  phase: PomodoroPhase;
  taskId?: string | null;
  cycleIndex?: number;
}

export async function fetchPomodoroSettings() {
  const { data } = await api.get<ApiResponse<PomodoroSettings>>("/pomodoro/settings");
  return data.data as PomodoroSettings;
}

export async function updatePomodoroSettings(payload: Partial<PomodoroSettings>) {
  const { data } = await api.patch<ApiResponse<PomodoroSettings>>("/pomodoro/settings", payload);
  return data.data as PomodoroSettings;
}

export async function fetchPomodoroSessions(params: SessionQuery = {}) {
  const { data } = await api.get<ApiResponse<Paginated<PomodoroSession>>>("/pomodoro/sessions", { params });
  return data.data as Paginated<PomodoroSession>;
}

export async function startPomodoroSession(payload: StartSessionPayload) {
  const { data } = await api.post<ApiResponse<PomodoroSession>>("/pomodoro/sessions", payload);
  return data.data as PomodoroSession;
}

export async function actOnPomodoroSession(id: string, action: "PAUSE" | "RESUME" | "COMPLETE" | "CANCEL") {
  const { data } = await api.patch<ApiResponse<PomodoroSession>>(`/pomodoro/sessions/${id}`, { action });
  return data.data as PomodoroSession;
}

export async function fetchPomodoroStats() {
  const { data } = await api.get<ApiResponse<PomodoroStats>>("/pomodoro/stats");
  return data.data as PomodoroStats;
}
