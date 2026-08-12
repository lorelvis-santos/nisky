-- CreateEnum
CREATE TYPE "TimeBlockExceptionAction" AS ENUM ('skip', 'move');

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "weeklyTargetMinutes" INTEGER;

-- CreateTable
CREATE TABLE "CalendarEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "allDay" BOOLEAN NOT NULL DEFAULT false,
    "startMin" INTEGER,
    "endMin" INTEGER,
    "location" VARCHAR(200),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CalendarEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TimeBlockException" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "blockId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "action" "TimeBlockExceptionAction" NOT NULL,
    "startMin" INTEGER,
    "endMin" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TimeBlockException_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CalendarEvent_userId_date_idx" ON "CalendarEvent"("userId", "date");

-- CreateIndex
CREATE INDEX "CalendarEvent_userId_allDay_date_idx" ON "CalendarEvent"("userId", "allDay", "date");

-- CreateIndex
CREATE INDEX "TimeBlockException_userId_date_idx" ON "TimeBlockException"("userId", "date");

-- CreateIndex
CREATE INDEX "TimeBlockException_blockId_date_idx" ON "TimeBlockException"("blockId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "TimeBlockException_blockId_date_key" ON "TimeBlockException"("blockId", "date");

-- AddForeignKey
ALTER TABLE "CalendarEvent" ADD CONSTRAINT "CalendarEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeBlockException" ADD CONSTRAINT "TimeBlockException_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeBlockException" ADD CONSTRAINT "TimeBlockException_blockId_fkey" FOREIGN KEY ("blockId") REFERENCES "TimeBlock"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Data Migration for repeatEveryWeeks (E.1)
UPDATE "TimeBlock" SET "repeatEveryWeeks" = 1 WHERE "repeatEveryWeeks" = 0;
