import { api } from "@/lib/api";
import type { ApiResponse } from "@/types/api.types";
import type { Habit, HabitEntry, HabitFrequency } from "@/types/entities";

export interface CreateHabitPayload {
  name: string;
  color?: string;
  frequency?: HabitFrequency;
  targetDays?: number;
}

export interface UpdateHabitPayload extends Partial<CreateHabitPayload> {
  archived?: boolean;
}

export async function fetchHabits(includeArchived = false) {
  const { data } = await api.get<ApiResponse<Habit[]>>("/habits", { params: { includeArchived } });
  return data.data as Habit[];
}

export async function createHabit(payload: CreateHabitPayload) {
  const { data } = await api.post<ApiResponse<Habit>>("/habits", payload);
  return data.data as Habit;
}

export async function updateHabit(id: string, payload: UpdateHabitPayload) {
  const { data } = await api.patch<ApiResponse<Habit>>(`/habits/${id}`, payload);
  return data.data as Habit;
}

export async function deleteHabit(id: string) {
  await api.delete(`/habits/${id}`);
}

export async function toggleHabitEntry(id: string, date: string) {
  const { data } = await api.post<ApiResponse<{ completed: boolean; streak: number }>>(`/habits/${id}/entries`, { date });
  return data.data as { completed: boolean; streak: number };
}

export async function fetchHabitEntries(id: string, from?: string, to?: string) {
  const { data } = await api.get<ApiResponse<HabitEntry[]>>(`/habits/${id}/entries`, { params: { from, to } });
  return data.data as HabitEntry[];
}
