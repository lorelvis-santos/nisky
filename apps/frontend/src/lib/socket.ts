import { io, type Socket } from "socket.io-client";

export type Domain = "tasks" | "comments" | "projects";
export interface DataChangedPayload {
  domain: Domain;
  kind?: "project" | "task" | "invitation" | "invitation_accepted" | "member_removed" | "member_role_changed";
  projectId?: string;
  taskId?: string;
  userId?: string;
  role?: string;
}

export const SocketEvents = {
  DATA_CHANGED: "data:changed",
  PRESENCE_JOIN: "presence:join",
  PRESENCE_LEAVE: "presence:leave",
} as const;

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL ?? "http://localhost:4000";

export const socket: Socket = io(SOCKET_URL, {
  autoConnect: false,
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 2000,
  reconnectionDelayMax: 10000,
  transports: ["websocket"],
});

const activePresence = new Map<string, { projectId: string; taskId: string | null }>();

function presenceKey(projectId: string, taskId: string | null): string {
  return `${projectId}:${taskId ?? ""}`;
}

export function sendPresence(projectId: string, taskId: string | null, join: boolean): void {
  const key = presenceKey(projectId, taskId);
  if (!join) {
    activePresence.delete(key);
  } else {
    activePresence.set(key, { projectId, taskId });
  }
  if (!socket.connected) return;
  socket.emit(join ? SocketEvents.PRESENCE_JOIN : SocketEvents.PRESENCE_LEAVE, { projectId, taskId });
}

socket.on("connect", () => {
  for (const { projectId, taskId } of activePresence.values()) {
    socket.emit(SocketEvents.PRESENCE_JOIN, { projectId, taskId });
  }
});
