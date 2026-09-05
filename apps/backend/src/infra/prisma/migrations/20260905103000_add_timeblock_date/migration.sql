-- AlterTable
ALTER TABLE "TimeBlock" ADD COLUMN "date" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "TimeBlock_userId_date_idx" ON "TimeBlock"("userId", "date");
