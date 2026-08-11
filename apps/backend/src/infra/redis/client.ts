import Redis from "ioredis";

const PRESENCE_TTL_SECONDS = 60;
const REFRESH_INTERVAL_MS = 30_000;

export const redis = new Redis(process.env.REDIS_URL ?? "redis://localhost:6379", {
  maxRetriesPerRequest: 3,
  retryStrategy: (times) => Math.min(times * 100, 3000),
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