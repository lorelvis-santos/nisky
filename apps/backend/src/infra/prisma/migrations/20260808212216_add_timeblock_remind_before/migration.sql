-- AlterTable
ALTER TABLE "TimeBlock" ADD COLUMN     "lastRemindNotifiedAt" TIMESTAMP(3),
ADD COLUMN     "remindBeforeMin" INTEGER NOT NULL DEFAULT 0;
