-- CreateEnum
CREATE TYPE "TaskSource" AS ENUM ('MANUAL', 'MOODLE');

-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "archivedAt" TIMESTAMP(3),
ADD COLUMN     "source" "TaskSource" NOT NULL DEFAULT 'MANUAL',
ADD COLUMN     "sourceRef" TEXT;

-- CreateIndex
CREATE INDEX "Task_userId_source_sourceRef_idx" ON "Task"("userId", "source", "sourceRef");

-- CreateIndex
CREATE UNIQUE INDEX "Task_userId_source_sourceRef_key" ON "Task"("userId", "source", "sourceRef");