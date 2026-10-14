-- CreateTable
CREATE TABLE "ai_responses" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "tokenHash" TEXT NOT NULL,
    "commandType" TEXT NOT NULL,
    "shortAnswer" TEXT NOT NULL,
    "detailedAnswer" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ai_usage" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "interactionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "admittedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "budgetDay" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "reservedTokens" INTEGER NOT NULL,
    "chargedTokens" INTEGER NOT NULL DEFAULT 0,
    "recoveryAt" DATETIME NOT NULL,
    "completedAt" DATETIME
);

CREATE UNIQUE INDEX "ai_responses_tokenHash_key" ON "ai_responses"("tokenHash");
CREATE INDEX "ai_responses_expiresAt_idx" ON "ai_responses"("expiresAt");
CREATE UNIQUE INDEX "ai_usage_interactionId_key" ON "ai_usage"("interactionId");
CREATE INDEX "ai_usage_userId_admittedAt_idx" ON "ai_usage"("userId", "admittedAt");
CREATE INDEX "ai_usage_guildId_admittedAt_idx" ON "ai_usage"("guildId", "admittedAt");
CREATE INDEX "ai_usage_budgetDay_idx" ON "ai_usage"("budgetDay");
CREATE INDEX "ai_usage_status_recoveryAt_idx" ON "ai_usage"("status", "recoveryAt");
