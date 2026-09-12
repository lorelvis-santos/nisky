ALTER TABLE "OAuthClient"
  ADD COLUMN "jwksUri" TEXT,
  ADD COLUMN "tokenEndpointAuthSigningAlg" TEXT;

CREATE TABLE "OAuthClientAssertion" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "jti" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OAuthClientAssertion_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "OAuthClientAssertion_jti_key" ON "OAuthClientAssertion"("jti");
CREATE INDEX "OAuthClientAssertion_clientId_expiresAt_idx" ON "OAuthClientAssertion"("clientId", "expiresAt");
CREATE INDEX "OAuthClientAssertion_expiresAt_idx" ON "OAuthClientAssertion"("expiresAt");

ALTER TABLE "OAuthClientAssertion"
  ADD CONSTRAINT "OAuthClientAssertion_clientId_fkey"
  FOREIGN KEY ("clientId") REFERENCES "OAuthClient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
