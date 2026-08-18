-- CreateTable
CREATE TABLE "JournalDraft" (
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT '',
    "contentCipher" BYTEA NOT NULL,
    "iv" BYTEA NOT NULL,
    "authTag" BYTEA NOT NULL,
    "classification" TEXT,
    "tags" TEXT[],
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JournalDraft_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "NoteDraft" (
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT '',
    "content" TEXT NOT NULL DEFAULT '',
    "category" TEXT,
    "tags" TEXT[],
    "pinned" BOOLEAN NOT NULL DEFAULT false,
    "projectId" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NoteDraft_pkey" PRIMARY KEY ("userId")
);

-- AddForeignKey
ALTER TABLE "JournalDraft" ADD CONSTRAINT "JournalDraft_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NoteDraft" ADD CONSTRAINT "NoteDraft_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;