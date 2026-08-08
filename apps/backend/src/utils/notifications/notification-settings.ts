import { prisma } from "../../infra/prisma/client";

export type NotificationSettingsFlags = {
  morningDigest: boolean;
  taskDueReminders: boolean;
  integrationNews: boolean;
  integrationErrors: boolean;
  timeBlockReminders: boolean;
};

const DEFAULTS: NotificationSettingsFlags = {
  morningDigest: true,
  taskDueReminders: true,
  integrationNews: true,
  integrationErrors: true,
  timeBlockReminders: true,
};

export async function defaultNotificationSettings(userId: string) {
  const settings = await prisma.notificationSettings.upsert({
    where: { userId },
    create: { userId },
    update: {},
  });
  return {
    morningDigest: settings.morningDigest,
    taskDueReminders: settings.taskDueReminders,
    integrationNews: settings.integrationNews,
    integrationErrors: settings.integrationErrors,
    timeBlockReminders: settings.timeBlockReminders,
  } as NotificationSettingsFlags;
}

export async function getNotificationFlag(userId: string, flag: keyof NotificationSettingsFlags) {
  const settings = await defaultNotificationSettings(userId);
  return settings[flag];
}

export { DEFAULTS };
