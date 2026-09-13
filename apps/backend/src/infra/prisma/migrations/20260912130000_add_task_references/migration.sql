-- CreateTable
CREATE TABLE "TaskReference" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT,
    "url" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "source" "TaskSource" NOT NULL DEFAULT 'MANUAL',
    "sourceRef" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TaskReference_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TaskReference_taskId_order_idx" ON "TaskReference"("taskId", "order");

-- CreateIndex
CREATE INDEX "TaskReference_userId_idx" ON "TaskReference"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "TaskReference_taskId_source_sourceRef_key" ON "TaskReference"("taskId", "source", "sourceRef");

-- AddForeignKey
ALTER TABLE "TaskReference" ADD CONSTRAINT "TaskReference_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskReference" ADD CONSTRAINT "TaskReference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill the integration links that were previously embedded in task descriptions.
INSERT INTO "TaskReference" ("id", "taskId", "userId", "title", "url", "order", "source", "sourceRef", "createdAt", "updatedAt")
SELECT
    md5(random()::text || clock_timestamp()::text)::uuid::text,
    task."id",
    task."userId",
    task."title",
    matches.url,
    matches.position::integer,
    task."source",
    task."sourceRef",
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "Task" AS task
CROSS JOIN LATERAL (
    SELECT
        match[1] AS url,
        row_number() OVER () - 1 AS position
    FROM regexp_matches(task."description", 'Link:[[:space:]]*(https?://[^[:space:]]+)', 'gi') AS match
) AS matches
WHERE task."description" ~* 'Link:[[:space:]]*https?://'
  AND (task."source" = 'MANUAL' OR matches.position = 0)
  AND NOT EXISTS (
      SELECT 1
      FROM "TaskReference" AS reference
      WHERE reference."taskId" = task."id"
        AND reference."source" = task."source"
        AND reference."sourceRef" IS NOT DISTINCT FROM task."sourceRef"
  );

-- Keep descriptions readable after moving the link into a first-class reference.
UPDATE "Task"
SET "description" = NULLIF(TRIM(regexp_replace("description", E'(^|\\n)[[:space:]]*Link:[[:space:]]*https?://[^[:space:]]+', '', 'gi')), '')
WHERE "description" ~* 'Link:[[:space:]]*https?://';
