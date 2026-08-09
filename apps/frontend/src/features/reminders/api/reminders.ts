import { api } from "@/lib/api";
import type { ApiResponse } from "@/types/api.types";
import type { Reminder, ReminderRepeatType } from "@/types/entities";

export type ReminderPayload = {
  type: "CUSTOM" | "TASK_DUE" | "HABIT" | "TIME_BLOCK_START";
  taskId?: string;
  habitId?: string;
  timeBlockId?: string;
};

export type ReminderInput = {
  title: string;
  body?: string;
  triggerAt: string;
  timezone: string;
  repeatType?: ReminderRepeatType;
  repeatInterval?: number;
  repeatDaysOfWeek?: number[];
  repeatDayOfMonth?: number;
  payload?: ReminderPayload;
};

export async function fetchReminders() {
  const { data } = await api.get<ApiResponse<Reminder[]>>("/reminders", { params: { status: "active", limit: 50 } });
  return data.data;
}

export async function createReminder(input: ReminderInput) {
  const { data } = await api.post<ApiResponse<Reminder>>("/reminders", input);
  return data.data;
}

export async function updateReminder(id: string, input: Partial<ReminderInput>) {
  const { data } = await api.patch<ApiResponse<Reminder>>(`/reminders/${id}`, input);
  return data.data;
}

export async function deleteReminder(id: string) {
  await api.delete(`/reminders/${id}`);
}

export async function snoozeReminder(id: string, minutes: number) {
  const { data } = await api.post<ApiResponse<Reminder>>(`/reminders/${id}/snooze`, { minutes });
  return data.data;
}

export async function fetchPendingReminders() {
  const { data } = await api.get<ApiResponse<Reminder[]>>("/reminders/pending");
  return data.data;
}

export type ResolveReminderPayload = { action: "accept" } | { action: "snooze"; triggerAt: string };

export async function resolveReminder(id: string, payload: ResolveReminderPayload) {
  const { data } = await api.post<ApiResponse<Reminder>>(`/reminders/${id}/resolve`, payload);
  return data.data;
}
