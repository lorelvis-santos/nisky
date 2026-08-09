-- AlterTable
ALTER TABLE "Habit" ADD COLUMN     "lastRemindedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "NotificationSettings" ADD COLUMN     "habitReminders" BOOLEAN NOT NULL DEFAULT true;
