import { prisma } from "../../infra/prisma/client";
import type { UpdateNotificationSettingsDto } from "./notifications.validator";

const settingsDefaults = {
  morningDigest: true,
  taskDueReminders: true,
  integrationNews: true,
  integrationErrors: true,
  timeBlockReminders: true,
};

export class NotificationService {
  getSettings(userId: string) {
    return prisma.notificationSettings.upsert({
      where: { userId },
      create: { userId, ...settingsDefaults },
      update: {},
    });
  }

  updateSettings(userId: string, data: UpdateNotificationSettingsDto) {
    return prisma.notificationSettings.upsert({
      where: { userId },
      create: { userId, ...settingsDefaults, ...data },
      update: data,
    });
  }
}

export const notificationService = new NotificationService();