-- CreateTable
CREATE TABLE "MoodleAccount" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "tokenCipher" TEXT NOT NULL,
    "tokenIv" TEXT NOT NULL,
    "tokenAuthTag" TEXT NOT NULL,
    "service" TEXT NOT NULL DEFAULT 'moodle_mobile_app',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "lastSyncAt" TIMESTAMP(3),
    "syncError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MoodleAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MoodleTask" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "taskKey" TEXT NOT NULL,
    "moodleEventId" INTEGER,
    "name" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "component" TEXT,
    "eventType" TEXT,
    "courseId" INTEGER,
    "course" TEXT,
    "courseShort" TEXT,
    "cmid" INTEGER,
    "instance" INTEGER,
    "dueAt" TIMESTAMP(3),
    "url" TEXT,
    "viewurl" TEXT,
    "overdue" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MoodleTask_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MoodleAccount_userId_idx" ON "MoodleAccount"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "MoodleAccount_userId_domain_key" ON "MoodleAccount"("userId", "domain");

-- CreateIndex
CREATE INDEX "MoodleTask_accountId_dueAt_idx" ON "MoodleTask"("accountId", "dueAt");

-- CreateIndex
CREATE INDEX "MoodleTask_dueAt_idx" ON "MoodleTask"("dueAt");

-- CreateIndex
CREATE UNIQUE INDEX "MoodleTask_accountId_taskKey_key" ON "MoodleTask"("accountId", "taskKey");

-- AddForeignKey
ALTER TABLE "MoodleAccount" ADD CONSTRAINT "MoodleAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MoodleTask" ADD CONSTRAINT "MoodleTask_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "MoodleAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
