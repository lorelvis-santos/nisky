import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchNotificationLogs, fetchNotificationSettings, updateNotificationSettings, type NotificationSettingsPayload } from "../api/notifications";

export function useNotificationSettingsQuery() {
  return useQuery({ queryKey: ["notification-settings"], queryFn: fetchNotificationSettings });
}

export function useNotificationLogsQuery() {
  return useQuery({ queryKey: ["notification-logs"], queryFn: () => fetchNotificationLogs(50) });
}

export function useNotificationSettingsMutation() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (payload: NotificationSettingsPayload) => updateNotificationSettings(payload),
    onSuccess: (settings) => client.setQueryData(["notification-settings"], settings),
  });
}
