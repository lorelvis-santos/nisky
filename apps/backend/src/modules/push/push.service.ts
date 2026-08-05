import webpush from "web-push";
import { prisma } from "../../infra/prisma/client";
import { AppError } from "../../utils/errors/handler";
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
    configureWebPush();
    const subscriptions = await prisma.pushSubscription.findMany({ where: { userId } });
    if (subscriptions.length === 0) return { sent: 0, total: 0 };

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

    await Promise.all(results.map(async (result, index) => {
      if (result.status !== "rejected") return;
      const error = result.reason as { statusCode?: number };
      if (error.statusCode === 404 || error.statusCode === 410) {
        await removeExpiredSubscription(userId, subscriptions[index]!.endpoint);
      }
    }));

    return {
      sent: results.filter((result) => result.status === "fulfilled").length,
      total: subscriptions.length,
    };
  }

  async sendTest(userId: string) {
    const result = await this.sendToUser(userId, {
      title: "Prueba de notificaciones",
      body: "Las notificaciones de Nisky están activas.",
      url: "/settings",
      tag: "nisky-test",
    });
    if (result.total === 0) throw new AppError("CONFLICT", "No tienes dispositivos suscritos");
    return result;
  }
}

export const pushService = new PushService();
