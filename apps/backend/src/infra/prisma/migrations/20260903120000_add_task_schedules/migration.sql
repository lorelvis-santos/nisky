-- CreateTable
CREATE TABLE "TaskSchedule" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "timeBlockId" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TaskSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TaskSchedule_userId_taskId_key" ON "TaskSchedule"("userId", "taskId");

-- CreateIndex
CREATE INDEX "TaskSchedule_userId_date_idx" ON "TaskSchedule"("userId", "date");

-- CreateIndex
CREATE INDEX "TaskSchedule_userId_timeBlockId_date_idx" ON "TaskSchedule"("userId", "timeBlockId", "date");

-- AddForeignKey
ALTER TABLE "TaskSchedule" ADD CONSTRAINT "TaskSchedule_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskSchedule" ADD CONSTRAINT "TaskSchedule_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskSchedule" ADD CONSTRAINT "TaskSchedule_timeBlockId_fkey" FOREIGN KEY ("timeBlockId") REFERENCES "TimeBlock"("id") ON DELETE SET NULL ON UPDATE CASCADE;
