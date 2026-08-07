export type IntegrationProvider = "MOODLE" | "CANVAS";

export interface RemoteItem {
  key: string;
  title: string;
  description: string | null;
  dueDate?: string | null;
}

export interface RemoteAccount {
  id: string;
  domain: string;
  username: string;
  tokenCipher: string;
  tokenIv: string;
  tokenAuthTag: string;
  enabled: boolean;
  lastSyncAt: Date | null;
  syncError: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ConnectInput {
  domain: string;
  username?: string;
  password?: string;
  token?: string;
  service?: string;
}

export interface IntegrationStrategy {
  provider: IntegrationProvider;
  source: "MOODLE" | "CANVAS";
  prefix: string;
  connect(data: ConnectInput): Promise<{ domain: string; username: string; token: string }>;
  fetchItems(domain: string, token: string, window: { daysPast: number; daysAhead: number }): Promise<RemoteItem[]>;
}