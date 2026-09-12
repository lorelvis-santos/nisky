import { api } from "@/lib/api";
import type { IntegrationAccount, IntegrationProvider, Task, UasdSyncJob } from "@/types/entities";

export async function getIntegrations() {
  const { data } = await api.get<{ data: IntegrationAccount[] }>("/integrations");
  return data.data;
}

export type ConnectIntegrationPayload = {
  domain?: string;
  username?: string;
  password?: string;
  token?: string;
};

export async function connectIntegration(provider: IntegrationProvider, payload: ConnectIntegrationPayload) {
  const { data } = await api.post<{ data: IntegrationAccount & { synced?: number; job?: UasdSyncJob } }>(`/integrations/${provider}`, payload, {
    timeout: provider === "UASD" ? 90_000 : undefined,
  });
  return data.data;
}

export async function syncIntegration(provider: IntegrationProvider, id: string) {
  const { data } = await api.post<{ data: { synced?: number; job?: UasdSyncJob } }>(`/integrations/${provider}/${id}/sync`);
  return data.data;
}

export async function getUasdSyncStatus(id: string) {
  const { data } = await api.get<{ data: UasdSyncJob }>(`/integrations/UASD/jobs/${id}`);
  return data.data;
}

export async function setIntegrationEnabled(provider: IntegrationProvider, id: string, enabled: boolean) {
  const { data } = await api.patch<{ data: IntegrationAccount }>(`/integrations/${provider}/${id}`, { enabled });
  return data.data;
}

export async function disconnectIntegration(provider: IntegrationProvider, id: string) {
  const { data } = await api.delete<{ data: { removed: number } }>(`/integrations/${provider}/${id}`);
  return data.data.removed;
}

export async function cleanIntegrationTasks(source?: IntegrationProvider) {
  const { data } = await api.delete<{ data: { removed: number } }>("/integrations/tasks", { params: source ? { source } : {} });
  return data.data.removed;
}

export type IntegrationTaskFilter = "pending" | "overdue" | "all";

export async function getIntegrationTasks(source: IntegrationProvider | undefined, filter: IntegrationTaskFilter, limit = 100) {
  const { data } = await api.get<{ data: Task[] }>("/integrations/tasks", { params: { ...(source ? { source } : {}), status: filter, limit } });
  return data.data;
}
