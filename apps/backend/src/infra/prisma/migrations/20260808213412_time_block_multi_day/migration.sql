-- AlterTable
ALTER TABLE "TimeBlock" ADD COLUMN "daysOfWeek" INTEGER[];

-- Backfill desde dayOfWeek
UPDATE "TimeBlock" SET "daysOfWeek" = ARRAY["dayOfWeek"];

-- DropIndex
DROP INDEX "TimeBlock_userId_dayOfWeek_isActive_idx";

-- AlterTable
ALTER TABLE "TimeBlock" DROP COLUMN "dayOfWeek";

-- CreateIndex
CREATE INDEX "TimeBlock_userId_isActive_idx" ON "TimeBlock"("userId", "isActive");
