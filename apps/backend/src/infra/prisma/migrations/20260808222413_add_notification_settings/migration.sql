-- CreateTable
CREATE TABLE "NotificationSettings" (
    "userId" TEXT NOT NULL,
    "morningDigest" BOOLEAN NOT NULL DEFAULT true,
    "taskDueReminders" BOOLEAN NOT NULL DEFAULT true,
    "integrationNews" BOOLEAN NOT NULL DEFAULT true,
    "integrationErrors" BOOLEAN NOT NULL DEFAULT true,
    "timeBlockReminders" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationSettings_pkey" PRIMARY KEY ("userId")
);

-- AddForeignKey
ALTER TABLE "NotificationSettings" ADD CONSTRAINT "NotificationSettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
