import { io, type Socket } from "socket.io-client";

export type Domain = "tasks" | "comments";
export interface DataChangedPayload {
  domain: Domain;
}

export const SocketEvents = {
  DATA_CHANGED: "data:changed",
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
