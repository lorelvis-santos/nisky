import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { actOnPomodoroSession, fetchPomodoroSessions, fetchPomodoroSettings, fetchPomodoroStats, startPomodoroSession, updatePomodoroSettings, type SessionQuery, type StartSessionPayload } from "../api/pomodoro";
import type { PomodoroSettings } from "@/types/entities";

export function usePomodoroSettingsQuery() {
  return useQuery({ queryKey: ["pomodoro-settings"], queryFn: fetchPomodoroSettings });
}

export function usePomodoroSessionsQuery(params: SessionQuery = {}) {
  return useQuery({ queryKey: ["pomodoro-sessions", params], queryFn: () => fetchPomodoroSessions(params) });
}

export function usePomodoroStatsQuery() {
  return useQuery({ queryKey: ["pomodoro-stats"], queryFn: fetchPomodoroStats });
}

export function usePomodoroMutations() {
  const client = useQueryClient();
  const invalidate = async () => {
    await client.invalidateQueries({ queryKey: ["pomodoro-sessions"] });
    await client.invalidateQueries({ queryKey: ["pomodoro-stats"] });
    await client.invalidateQueries({ queryKey: ["pomodoro-settings"] });
    await client.invalidateQueries({ queryKey: ["tasks"] });
    await client.invalidateQueries({ queryKey: ["task"] });
  };
  const start = useMutation({ mutationFn: (payload: StartSessionPayload) => startPomodoroSession(payload), onSuccess: invalidate });
  const action = useMutation({ mutationFn: ({ id, action }: { id: string; action: "PAUSE" | "RESUME" | "COMPLETE" | "CANCEL" }) => actOnPomodoroSession(id, action), onSuccess: invalidate });
  const updateSettings = useMutation({ mutationFn: (payload: Partial<PomodoroSettings>) => updatePomodoroSettings(payload), onSuccess: invalidate });
  return { start, action, updateSettings };
}
