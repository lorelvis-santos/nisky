import { api } from "@/lib/api";
import type { IntegrationAccount, IntegrationProvider, Task } from "@/types/entities";

export async function getIntegrations() {
  const { data } = await api.get<{ data: IntegrationAccount[] }>("/integrations");
  return data.data;
}

export type ConnectIntegrationPayload = {
  domain: string;
  username?: string;
  password?: string;
  token?: string;
};

export async function connectIntegration(provider: IntegrationProvider, payload: ConnectIntegrationPayload) {
  const { data } = await api.post<{ data: IntegrationAccount }>(`/integrations/${provider}`, payload);
  return data.data;
}

export async function syncIntegration(provider: IntegrationProvider, id: string) {
  const { data } = await api.post<{ data: { synced: number } }>(`/integrations/${provider}/${id}/sync`);
  return data.data.synced;
}

export async function setIntegrationEnabled(provider: IntegrationProvider, id: string, enabled: boolean) {
  const { data } = await api.patch<{ data: IntegrationAccount }>(`/integrations/${provider}/${id}`, { enabled });
  return data.data;
}

export async function disconnectIntegration(provider: IntegrationProvider, id: string) {
  const { data } = await api.delete<{ data: { removed: number } }>(`/integrations/${provider}/${id}`);
  return data.data.removed;
}

export async function cleanIntegrationTasks(provider: IntegrationProvider) {
  const { data } = await api.delete<{ data: { removed: number } }>("/integrations/tasks", { params: { source: provider } });
  return data.data.removed;
}

export type IntegrationTaskFilter = "pending" | "overdue" | "all";

export async function getIntegrationTasks(provider: IntegrationProvider, filter: IntegrationTaskFilter, limit = 100) {
  const { data } = await api.get<{ data: Task[] }>("/integrations/tasks", { params: { source: provider, status: filter, limit } });
  return data.data;
}