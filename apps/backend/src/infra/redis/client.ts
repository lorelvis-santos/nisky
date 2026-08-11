import Redis from "ioredis";

export const REDIS_LOG_PREFIX = "[redis]";

const PRESENCE_TTL_SECONDS = 60;
const REFRESH_INTERVAL_MS = 30_000;

export const redis = new Redis(process.env.REDIS_URL ?? "redis://localhost:6379", {
  maxRetriesPerRequest: 3,
  retryStrategy: (times) => Math.min(times * 100, 3000),
  lazyConnect: false,
});

redis.on("connect", () => {
  console.log(`${REDIS_LOG_PREFIX} conectado a ${process.env.REDIS_URL ?? "redis://localhost:6379"}`);
});

redis.on("ready", () => {
  console.log(`${REDIS_LOG_PREFIX} listo`);
});

redis.on("reconnecting", (delay: number) => {
  console.warn(`${REDIS_LOG_PREFIX} reintentando conexión en ${delay}ms`);
});

redis.on("error", (error: Error) => {
  console.error(`${REDIS_LOG_PREFIX} error: ${error.message}`);
});

redis.on("end", () => {
  console.warn(`${REDIS_LOG_PREFIX} conexión finalizada`);
});

export function presenceKey(userId: string, projectId: string, taskId: string | null): string {
  return `presence:${userId}:${projectId}${taskId ? `:${taskId}` : ""}`;
}

export async function trackPresence(userId: string, projectId: string, taskId: string | null, join: boolean): Promise<void> {
  const key = presenceKey(userId, projectId, taskId);
  if (join) {
    await redis.set(key, Date.now().toString(), "EX", PRESENCE_TTL_SECONDS);
  } else {
    await redis.del(key);
  }
  console.log(`${REDIS_LOG_PREFIX} presence ${join ? "join" : "leave"} user=${userId.slice(0, 8)} key=${key} ttl=${PRESENCE_TTL_SECONDS}s`);
}

export async function isUserInChat(userId: string, projectId: string, taskId: string | null): Promise<boolean> {
  return (await redis.exists(presenceKey(userId, projectId, taskId))) === 1;
}

export async function clearUserPresence(userId: string): Promise<void> {
  const keys = await redis.keys(`presence:${userId}:*`);
  if (keys.length > 0) {
    await redis.del(...keys);
  }
}

export const socketPresence = {
  ttlSeconds: PRESENCE_TTL_SECONDS,
  refreshIntervalMs: REFRESH_INTERVAL_MS,
};