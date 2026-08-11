import { getIo } from "./socket";
import { SocketEvents, SocketRooms, type DataChangedPayload, type Domain } from "./socket.constants";

export function emitToUser(userId: string, domain: Domain, meta?: Omit<DataChangedPayload, "domain">): void {
  try {
    getIo().to(SocketRooms.USER(userId)).emit(SocketEvents.DATA_CHANGED, { domain, ...meta });
  } catch {
    /* best effort: socket no inicializado o error transitorio */
  }
}

export function emitToUsers(userIds: string[], domain: Domain, meta?: Omit<DataChangedPayload, "domain">): void {
  const unique = [...new Set(userIds.filter(Boolean))];
  for (const id of unique) emitToUser(id, domain, meta);
}