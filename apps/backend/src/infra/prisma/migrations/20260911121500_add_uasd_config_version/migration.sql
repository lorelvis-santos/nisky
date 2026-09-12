-- Add configuration fencing so reconnecting cannot publish stale results.
ALTER TABLE "UasdAccount"
  ADD COLUMN "configurationVersion" INTEGER NOT NULL DEFAULT 1;

ALTER TABLE "UasdSyncJob"
  ADD COLUMN "configurationVersion" INTEGER NOT NULL DEFAULT 1;
