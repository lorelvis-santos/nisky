import webpush from "web-push";
import { prisma } from "../../infra/prisma/client";
import { AppError } from "../../utils/errors/handler";
import { hasSkippedLogToday, recordNotificationLog } from "./notification-log.service";
import { isUserInChat } from "../../infra/redis/client";
import type { PushSubscriptionDto, PushUnsubscribeDto } from "./push.validator";

type NotificationPayload = {
  title: string;
  body?: string;
  url?: string;
  tag?: string;
  data?: Record<string, unknown>;
};

let configured = false;

function configureWebPush() {
  if (configured) return;
  const subject = process.env.VAPID_SUBJECT;
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!subject || !publicKey || !privateKey) {
    throw new AppError("BAD_REQUEST", "Las notificaciones no están configuradas");
  }
  webpush.setVapidDetails(subject, publicKey, privateKey);
  configured = true;
}

async function removeExpiredSubscription(userId: string, endpoint: string) {
  await prisma.pushSubscription.deleteMany({ where: { userId, endpoint } });
}

export class PushService {
  getPublicKey() {
    const publicKey = process.env.VAPID_PUBLIC_KEY;
    if (!publicKey) throw new AppError("BAD_REQUEST", "Las notificaciones no están configuradas");
    return { publicKey };
  }

  async subscribe(userId: string, data: PushSubscriptionDto) {
    const subscription = await prisma.pushSubscription.upsert({
      where: { userId_endpoint: { userId, endpoint: data.endpoint } },
      create: {
        userId,
        endpoint: data.endpoint,
        p256dh: data.keys.p256dh,
        auth: data.keys.auth,
        userAgent: data.userAgent,
      },
      update: {
        p256dh: data.keys.p256dh,
        auth: data.keys.auth,
        userAgent: data.userAgent,
      },
    });

    const extra = await prisma.pushSubscription.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      select: { id: true },
      skip: 5,
    });
    if (extra.length > 0) {
      await prisma.pushSubscription.deleteMany({ where: { id: { in: extra.map((item) => item.id) } } });
    }
    return subscription;
  }

  async unsubscribe(userId: string, data: PushUnsubscribeDto) {
    const result = await prisma.pushSubscription.deleteMany({ where: { userId, endpoint: data.endpoint } });
    if (result.count === 0) throw new AppError("NOT_FOUND", "Suscripción no encontrada");
  }

  list(userId: string) {
    return prisma.pushSubscription.findMany({
      where: { userId },
      select: { id: true, endpoint: true, userAgent: true, createdAt: true, updatedAt: true },
      orderBy: { createdAt: "desc" },
    });
  }

  async sendToUser(userId: string, payload: NotificationPayload) {
    const type = typeof payload.data?.type === "string" ? payload.data.type : "push";
    if (payload.data?.type === "COMMENT" && typeof payload.data.projectId === "string") {
      try {
        const inChat = await isUserInChat(
          userId,
          payload.data.projectId,
          typeof payload.data.taskId === "string" ? payload.data.taskId : null,
        );
        console.log(
          `[notif] comment-suppress=${inChat ? "yes" : "no"} type=${type} user=${userId.slice(0, 8)} project=${payload.data.projectId.slice(0, 8)}${payload.data.taskId ? ` task=${String(payload.data.taskId).slice(0, 8)}` : ""} title="${payload.title}"`,
        );
        if (inChat) return { sent: 0, total: 0 };
      } catch (error) {
        console.error(`[notif] comment-presence-check-error: ${(error as Error).message}`);
        /* best effort: si Redis falla, se envía el push */
      }
    }
    configureWebPush();
    const subscriptions = await prisma.pushSubscription.findMany({ where: { userId } });
    if (subscriptions.length === 0) {
      const event = typeof payload.data?.type === "string" ? payload.data.type : "push";
      const dayStart = new Date();
      dayStart.setHours(0, 0, 0, 0);
      if (!(await hasSkippedLogToday(userId, event, payload.title, dayStart, "Sin suscripciones"))) {
        await recordNotificationLog({
          userId,
          event,
          title: payload.title,
          body: payload.body,
          status: "skipped",
          error: "Sin suscripciones registradas para el usuario",
        });
      }
      return { sent: 0, total: 0 };
    }

    const serialized = JSON.stringify({
      title: payload.title,
      body: payload.body,
      icon: "/icons/icon-192x192.png",
      badge: "/icons/badge-72x72.png",
      tag: payload.tag,
      data: { url: payload.url ?? "/", ...payload.data },
    });
    const results = await Promise.allSettled(subscriptions.map((subscription) => webpush.sendNotification({
      endpoint: subscription.endpoint,
      keys: { p256dh: subscription.p256dh, auth: subscription.auth },
    }, serialized)));

    let firstError: string | null = null;
    await Promise.all(results.map(async (result, index) => {
      if (result.status !== "rejected") return;
      const error = result.reason as { statusCode?: number; message?: string };
      if (!firstError) firstError = `${error.statusCode ?? "ERR"}: ${error.message ?? "desconocido"}`;
      if (error.statusCode === 404 || error.statusCode === 410) {
        await removeExpiredSubscription(userId, subscriptions[index]!.endpoint);
      }
    }));

    const sent = results.filter((result) => result.status === "fulfilled").length;
    const total = subscriptions.length;
    const status = sent === total ? "sent" : sent > 0 ? "partial" : "failed";

    await recordNotificationLog({
      userId,
      event: typeof payload.data?.type === "string" ? payload.data.type : "push",
      title: payload.title,
      body: payload.body,
      status,
      sentCount: sent,
      totalCount: total,
      error: firstError,
    });
    const taskId = typeof payload.data?.taskId === "string" ? payload.data.taskId : undefined;
    const projectId = typeof payload.data?.projectId === "string" ? payload.data.projectId : undefined;
    const context =
      taskId !== undefined
        ? ` kind=task task=${taskId.slice(0, 8)}`
        : projectId !== undefined
          ? ` kind=project project=${projectId.slice(0, 8)}`
          : "";
    console.log(`[notif] result type=${type} status=${status} sent=${sent}/${total} user=${userId.slice(0, 8)}${context} "${payload.title}"${firstError ? ` error=${firstError}` : ""}`);

    return { sent, total };
  }

  async sendTest(userId: string) {
    const result = await this.sendToUser(userId, {
      title: "🔔 Todo listo",
      body: "Las notificaciones de Nisky están activas",
      url: "/settings",
      tag: "nisky-test",
      data: { type: "test" },
    });
    if (result.total === 0) throw new AppError("CONFLICT", "No tienes dispositivos suscritos");
    return result;
  }
}

export const pushService = new PushService();
