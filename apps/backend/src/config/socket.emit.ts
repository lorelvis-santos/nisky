import { getIo } from "./socket";
import { SocketEvents, SocketRooms, type Domain } from "./socket.constants";

export function emitToUser(userId: string, domain: Domain): void {
  try {
    getIo().to(SocketRooms.USER(userId)).emit(SocketEvents.DATA_CHANGED, { domain });
  } catch {
    /* best effort: socket no inicializado o error transitorio */
  }
}

export function emitToUsers(userIds: string[], domain: Domain): void {
  const unique = [...new Set(userIds.filter(Boolean))];
  for (const id of unique) emitToUser(id, domain);
}