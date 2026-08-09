import { api } from "@/lib/api";

export type NotificationSettingsPayload = Partial<{
  morningDigest: boolean;
  taskDueReminders: boolean;
  integrationNews: boolean;
  integrationErrors: boolean;
  timeBlockReminders: boolean;
  habitReminders: boolean;
}>;

export type NotificationSettings = NotificationSettingsPayload & {
  updatedAt: string;
};

export async function fetchNotificationSettings() {
  const { data } = await api.get<{ data: NotificationSettings }>("/notifications/settings");
  return data.data;
}

export async function updateNotificationSettings(payload: NotificationSettingsPayload) {
  const { data } = await api.patch<{ data: NotificationSettings }>("/notifications/settings", payload);
  return data.data;
}

export type NotificationLog = {
  id: string;
  event: string;
  title: string;
  body: string | null;
  status: "sent" | "partial" | "failed" | "skipped";
  sentCount: number;
  totalCount: number;
  error: string | null;
  createdAt: string;
};

export async function fetchNotificationLogs(limit = 50) {
  const { data } = await api.get<{ data: NotificationLog[] }>("/push/logs", { params: { limit } });
  return data.data;
}