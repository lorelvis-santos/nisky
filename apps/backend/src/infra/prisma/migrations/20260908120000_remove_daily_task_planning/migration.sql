-- Remove standalone day planning before making every schedule a block assignment.
DELETE FROM "TaskSchedule" WHERE "timeBlockId" IS NULL;

-- Replace nullable block links with required links and remove assignments with deleted blocks.
ALTER TABLE "TaskSchedule" DROP CONSTRAINT "TaskSchedule_timeBlockId_fkey";
ALTER TABLE "TaskSchedule" ALTER COLUMN "timeBlockId" SET NOT NULL;
ALTER TABLE "TaskSchedule"
  ADD CONSTRAINT "TaskSchedule_timeBlockId_fkey"
  FOREIGN KEY ("timeBlockId") REFERENCES "TimeBlock"("id") ON DELETE CASCADE ON UPDATE CASCADE;
