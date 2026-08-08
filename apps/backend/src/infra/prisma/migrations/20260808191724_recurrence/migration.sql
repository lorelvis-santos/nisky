-- CreateEnum
CREATE TYPE "TaskRecurrenceType" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY');

-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "recurrenceDayOfMonth" INTEGER,
ADD COLUMN     "recurrenceDaysOfWeek" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
ADD COLUMN     "recurrenceEndsAt" TIMESTAMP(3),
ADD COLUMN     "recurrenceInterval" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "recurrenceParentId" TEXT,
ADD COLUMN     "recurrenceType" "TaskRecurrenceType";

-- AlterTable
ALTER TABLE "TimeBlock" ADD COLUMN     "repeatEndsAt" TIMESTAMP(3),
ADD COLUMN     "repeatEveryWeeks" INTEGER NOT NULL DEFAULT 1;

-- CreateIndex
CREATE INDEX "Task_userId_recurrenceType_idx" ON "Task"("userId", "recurrenceType");

-- CreateIndex
CREATE INDEX "Task_recurrenceParentId_idx" ON "Task"("recurrenceParentId");

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_recurrenceParentId_fkey" FOREIGN KEY ("recurrenceParentId") REFERENCES "Task"("id") ON DELETE SET NULL ON UPDATE CASCADE;
