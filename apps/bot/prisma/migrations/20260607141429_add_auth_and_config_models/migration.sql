-- AlterTable
ALTER TABLE "Bot" ADD COLUMN     "defaultChannelId" TEXT,
ADD COLUMN     "metadata" JSONB,
ADD COLUMN     "welcomeMediaUrl" TEXT,
ADD COLUMN     "welcomeMessage" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "lastLoginAt" TIMESTAMP(3),
ADD COLUMN     "passwordHash" TEXT,
ADD COLUMN     "role" TEXT NOT NULL DEFAULT 'user';

-- CreateTable
CREATE TABLE "BotConfig" (
    "id" TEXT NOT NULL,
    "botId" TEXT NOT NULL,
    "channelId" TEXT,
    "channelName" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BotConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Plan" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "days" INTEGER NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "emoji" TEXT NOT NULL DEFAULT '💎',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Plan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BotPlan" (
    "id" TEXT NOT NULL,
    "botId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BotPlan_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BotConfig_botId_key" ON "BotConfig"("botId");

-- CreateIndex
CREATE INDEX "BotConfig_botId_idx" ON "BotConfig"("botId");

-- CreateIndex
CREATE INDEX "Plan_isActive_idx" ON "Plan"("isActive");

-- CreateIndex
CREATE INDEX "BotPlan_botId_idx" ON "BotPlan"("botId");

-- CreateIndex
CREATE INDEX "BotPlan_planId_idx" ON "BotPlan"("planId");

-- CreateIndex
CREATE UNIQUE INDEX "BotPlan_botId_planId_key" ON "BotPlan"("botId", "planId");

-- CreateIndex
CREATE INDEX "Bot_status_idx" ON "Bot"("status");

-- CreateIndex
CREATE INDEX "User_isActive_idx" ON "User"("isActive");

-- AddForeignKey
ALTER TABLE "BotConfig" ADD CONSTRAINT "BotConfig_botId_fkey" FOREIGN KEY ("botId") REFERENCES "Bot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BotPlan" ADD CONSTRAINT "BotPlan_botId_fkey" FOREIGN KEY ("botId") REFERENCES "Bot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BotPlan" ADD CONSTRAINT "BotPlan_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
