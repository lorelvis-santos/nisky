import { prisma } from "../../infra/prisma/client";

export type NotificationLogStatus = "sent" | "partial" | "failed" | "skipped";

export type NotificationLogInput = {
  userId: string;
  event: string;
  title: string;
  body?: string | null;
  status: NotificationLogStatus;
  sentCount?: number;
  totalCount?: number;
  error?: string | null;
};

export async function recordNotificationLog(input: NotificationLogInput) {
  try {
    await prisma.notificationLog.create({
      data: {
        userId: input.userId,
        event: input.event,
        title: input.title.slice(0, 200),
        body: input.body ? input.body.slice(0, 500) : null,
        status: input.status,
        sentCount: input.sentCount ?? 0,
        totalCount: input.totalCount ?? 0,
        error: input.error ? input.error.slice(0, 500) : null,
      },
    });
  } catch (error) {
    console.error("[notif-log] No se pudo registrar el log de notificación", error);
  }
}

export function listNotificationLogs(userId: string, limit = 50) {
  return prisma.notificationLog.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: Math.min(Math.max(limit, 1), 200),
  });
}

export async function hasSkippedLogToday(userId: string, event: string, title: string, since: Date, errorPrefix?: string) {
  const count = await prisma.notificationLog.count({
    where: {
      userId,
      event,
      title: title.slice(0, 200),
      status: "skipped",
      createdAt: { gte: since },
      ...(errorPrefix ? { error: { startsWith: errorPrefix } } : {}),
    },
  });
  return count > 0;
}