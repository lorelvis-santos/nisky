-- AlterEnum
ALTER TYPE "TaskSource" ADD VALUE 'CANVAS';

-- CreateTable
CREATE TABLE "CanvasAccount" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "username" TEXT NOT NULL DEFAULT '',
    "tokenCipher" TEXT NOT NULL,
    "tokenIv" TEXT NOT NULL,
    "tokenAuthTag" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "lastSyncAt" TIMESTAMP(3),
    "syncError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CanvasAccount_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CanvasAccount_userId_idx" ON "CanvasAccount"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "CanvasAccount_userId_domain_key" ON "CanvasAccount"("userId", "domain");

-- AddForeignKey
ALTER TABLE "CanvasAccount" ADD CONSTRAINT "CanvasAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
