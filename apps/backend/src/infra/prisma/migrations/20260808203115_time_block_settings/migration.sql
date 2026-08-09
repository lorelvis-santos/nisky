-- CreateTable
CREATE TABLE "TimeBlockSettings" (
    "userId" TEXT NOT NULL,
    "dayStartMin" INTEGER NOT NULL DEFAULT 360,
    "dayEndMin" INTEGER NOT NULL DEFAULT 1380,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TimeBlockSettings_pkey" PRIMARY KEY ("userId")
);

-- AddForeignKey
ALTER TABLE "TimeBlockSettings" ADD CONSTRAINT "TimeBlockSettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
