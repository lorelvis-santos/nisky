-- AlterTable
ALTER TABLE "PushSubscription" ADD COLUMN     "disabledAt" TIMESTAMP(3),
ADD COLUMN     "lastErrorAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "PushSubscription_disabledAt_idx" ON "PushSubscription"("disabledAt");
