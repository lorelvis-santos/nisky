import type { Server as HttpServer } from "node:http";
import { Server, type Socket } from "socket.io";
import jwt from "jsonwebtoken";
import { corsConfig } from "./cors";
import { SocketEvents, SocketRooms, type DataChangedPayload } from "./socket.constants";
import { patService } from "../modules/auth/pat.service";
import { socketPresence, trackPresence } from "../infra/redis/client";

interface ServerToClientEvents {
  [SocketEvents.DATA_CHANGED]: (payload: DataChangedPayload) => void;
  [SocketEvents.SERVER_BOOT_VERSION]: (payload: { version: string }) => void;
  [SocketEvents.FORCE_UPDATE]: () => void;
}

interface ClientToServerEvents {
  [SocketEvents.PRESENCE_JOIN]: (payload: { projectId: string; taskId?: string | null }) => void;
  [SocketEvents.PRESENCE_LEAVE]: (payload: { projectId: string; taskId?: string | null }) => void;
}

interface InterServerEvents {}

interface SocketData {
  user: { id: string; email: string; role: string };
}

type TypedServer = Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;
type TypedSocket = Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;

let io: TypedServer | undefined;

const SERVER_BOOT_VERSION = Date.now().toString();

export function initSocket(httpServer: HttpServer): TypedServer {
  io = new Server(httpServer, { cors: corsConfig, path: "/socket.io/" });

  io.use(async (socket: TypedSocket, next) => {
    const token = socket.handshake.auth?.token as string | undefined;
    if (!token) return next(new Error("Autenticación denegada: token requerido"));
    try {
      if (token.startsWith("nisky_pat_")) {
        const user = await patService.verify(token);
        socket.data.user = { id: user.id, email: user.email, role: user.role };
      } else {
        const secret = process.env.JWT_ACCESS_SECRET;
        if (!secret) return next(new Error("JWT_ACCESS_SECRET no configurado"));
        const payload = jwt.verify(token, secret) as { sub: string; email: string; role: string };
        socket.data.user = { id: payload.sub, email: payload.email, role: payload.role };
      }
      next();
    } catch {
      next(new Error("Autenticación denegada: token inválido"));
    }
  });

  io.on("connection", (socket: TypedSocket) => {
    socket.join(SocketRooms.USER(socket.data.user.id));

    const presenceKeys = new Map<string, { interval: NodeJS.Timeout; projectId: string; taskId: string | null }>();

    socket.on(SocketEvents.PRESENCE_JOIN, ({ projectId, taskId }: { projectId: string; taskId?: string | null }) => {
      trackPresence(socket.data.user.id, projectId, taskId ?? null, true).catch(() => undefined);
      const key = `${projectId}:${taskId ?? ""}`;
      const existing = presenceKeys.get(key);
      if (existing) clearInterval(existing.interval);
      const interval = setInterval(() => {
        trackPresence(socket.data.user.id, projectId, taskId ?? null, true).catch(() => undefined);
      }, socketPresence.refreshIntervalMs);
      presenceKeys.set(key, { interval, projectId, taskId: taskId ?? null });
    });

    socket.on(SocketEvents.PRESENCE_LEAVE, ({ projectId, taskId }: { projectId: string; taskId?: string | null }) => {
      const key = `${projectId}:${taskId ?? ""}`;
      const current = presenceKeys.get(key);
      if (current) clearInterval(current.interval);
      presenceKeys.delete(key);
      trackPresence(socket.data.user.id, projectId, taskId ?? null, false).catch(() => undefined);
    });

    socket.on("disconnect", () => {
      for (const { interval, projectId, taskId } of presenceKeys.values()) {
        clearInterval(interval);
        trackPresence(socket.data.user.id, projectId, taskId, false).catch(() => undefined);
      }
      presenceKeys.clear();
    });

    socket.emit(SocketEvents.SERVER_BOOT_VERSION, { version: SERVER_BOOT_VERSION });
  });

  return io;
}

export function getIo(): TypedServer {
  if (!io) throw new Error("Socket.io no inicializado");
  return io;
}
