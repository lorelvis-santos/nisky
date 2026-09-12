-- AlterEnum
ALTER TYPE "TaskSource" ADD VALUE 'UASD';

-- CreateEnum
CREATE TYPE "UasdSyncJobStatus" AS ENUM ('PENDING', 'RUNNING', 'SUCCEEDED', 'FAILED', 'CANCELLED');

-- CreateTable
CREATE TABLE "UasdAccount" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "domain" TEXT NOT NULL DEFAULT 'https://app.uasd.edu.do',
    "username" TEXT NOT NULL,
    "passwordCipher" TEXT NOT NULL,
    "passwordIv" TEXT NOT NULL,
    "passwordAuthTag" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "lastSyncAt" TIMESTAMP(3),
    "nextSyncAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "syncError" TEXT,
    "projectId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UasdAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UasdSyncJob" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "status" "UasdSyncJobStatus" NOT NULL DEFAULT 'PENDING',
    "reason" TEXT NOT NULL DEFAULT 'scheduled',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 5,
    "availableAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "claimedAt" TIMESTAMP(3),
    "claimedBy" TEXT,
    "leaseExpiresAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "lastError" TEXT,
    "dedupeKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UasdSyncJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UasdAccount_userId_domain_key" ON "UasdAccount"("userId", "domain");
CREATE INDEX "UasdAccount_userId_idx" ON "UasdAccount"("userId");
CREATE INDEX "UasdAccount_enabled_nextSyncAt_idx" ON "UasdAccount"("enabled", "nextSyncAt");
CREATE INDEX "UasdSyncJob_status_availableAt_idx" ON "UasdSyncJob"("status", "availableAt");
CREATE INDEX "UasdSyncJob_accountId_status_idx" ON "UasdSyncJob"("accountId", "status");
CREATE UNIQUE INDEX "UasdSyncJob_dedupeKey_key" ON "UasdSyncJob"("dedupeKey");

-- AddForeignKey
ALTER TABLE "UasdAccount" ADD CONSTRAINT "UasdAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UasdAccount" ADD CONSTRAINT "UasdAccount_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "UasdSyncJob" ADD CONSTRAINT "UasdSyncJob_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "UasdAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
