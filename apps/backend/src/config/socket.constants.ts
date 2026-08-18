export enum SocketEvents {
  DATA_CHANGED = "data:changed",
  SERVER_BOOT_VERSION = "app:version",
  FORCE_UPDATE = "app:force_update",
  PRESENCE_JOIN = "presence:join",
  PRESENCE_LEAVE = "presence:leave",
}

export const SocketRooms = {
  USER: (id: string) => `USER:${id}`,
} as const;

export type Domain = "tasks" | "comments" | "projects";

export interface DataChangedPayload {
  domain: Domain;
  kind?: "project" | "task" | "invitation" | "invitation_accepted" | "invitation_cancelled" | "member_removed" | "member_role_changed";
  projectId?: string;
  taskId?: string;
  userId?: string;
  role?: string;
}