import { api } from "@/lib/api";
import type { NotificationSettings } from "@/types/entities";

export type NotificationSettingsPayload = Partial<Omit<NotificationSettings, "userId" | "updatedAt">>;

export async function fetchNotificationSettings() {
  const { data } = await api.get<{ data: NotificationSettings }>("/notifications/settings");
  return data.data;
}

export async function updateNotificationSettings(payload: NotificationSettingsPayload) {
  const { data } = await api.patch<{ data: NotificationSettings }>("/notifications/settings", payload);
  return data.data;
}
