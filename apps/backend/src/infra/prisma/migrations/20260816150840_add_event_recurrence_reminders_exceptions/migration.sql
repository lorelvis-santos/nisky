-- CreateEnum
CREATE TYPE "EventRecurrenceType" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY');

-- CreateEnum
CREATE TYPE "CalendarEventExceptionAction" AS ENUM ('skip', 'move');

-- AlterTable
ALTER TABLE "CalendarEvent" ADD COLUMN     "lastEndWarnNotifiedAt" TIMESTAMP(3),
ADD COLUMN     "lastRemindNotifiedAt" TIMESTAMP(3),
ADD COLUMN     "lastStartNotifiedAt" TIMESTAMP(3),
ADD COLUMN     "recurrenceDayOfMonth" INTEGER,
ADD COLUMN     "recurrenceDaysOfWeek" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
ADD COLUMN     "recurrenceEndsAt" TIMESTAMP(3),
ADD COLUMN     "recurrenceInterval" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "recurrenceType" "EventRecurrenceType",
ADD COLUMN     "remindBeforeMin" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "NotificationSettings" ADD COLUMN     "eventReminders" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "CalendarEventException" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "action" "CalendarEventExceptionAction" NOT NULL,
    "startMin" INTEGER,
    "endMin" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CalendarEventException_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CalendarEventException_userId_date_idx" ON "CalendarEventException"("userId", "date");

-- CreateIndex
CREATE INDEX "CalendarEventException_eventId_date_idx" ON "CalendarEventException"("eventId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "CalendarEventException_eventId_date_key" ON "CalendarEventException"("eventId", "date");

-- AddForeignKey
ALTER TABLE "CalendarEventException" ADD CONSTRAINT "CalendarEventException_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalendarEventException" ADD CONSTRAINT "CalendarEventException_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "CalendarEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
