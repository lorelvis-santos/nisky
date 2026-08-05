-- CreateEnum
CREATE TYPE "TaskSource" AS ENUM ('MANUAL', 'MOODLE');

-- DropForeignKey
ALTER TABLE "MoodleTask" DROP CONSTRAINT "MoodleTask_accountId_fkey";

-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "archivedAt" TIMESTAMP(3),
ADD COLUMN     "source" "TaskSource" NOT NULL DEFAULT 'MANUAL',
ADD COLUMN     "sourceRef" TEXT;

-- DropTable
DROP TABLE "MoodleTask";

-- CreateIndex
CREATE INDEX "Task_userId_source_sourceRef_idx" ON "Task"("userId", "source", "sourceRef");

-- CreateIndex
CREATE UNIQUE INDEX "Task_userId_source_sourceRef_key" ON "Task"("userId", "source", "sourceRef");

