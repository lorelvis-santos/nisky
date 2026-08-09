-- AlterTable
ALTER TABLE "TimeBlock" ADD COLUMN     "lastEndWarnNotifiedAt" TIMESTAMP(3),
ADD COLUMN     "lastStartNotifiedAt" TIMESTAMP(3);
