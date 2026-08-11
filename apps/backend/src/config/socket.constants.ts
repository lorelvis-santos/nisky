export enum SocketEvents {
  DATA_CHANGED = "data:changed",
  SERVER_BOOT_VERSION = "app:version",
  FORCE_UPDATE = "app:force_update",
}

export const SocketRooms = {
  USER: (id: string) => `USER:${id}`,
} as const;

export type Domain = "tasks" | "comments";

export interface DataChangedPayload {
  domain: Domain;
}
