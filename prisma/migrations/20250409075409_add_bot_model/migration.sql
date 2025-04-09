/*
  Warnings:

  - Added the required column `botId` to the `AIInteraction` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "AIInteraction" ADD COLUMN     "botId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "ReadingProgress" ADD COLUMN     "currentBotId" TEXT;

-- CreateTable
CREATE TABLE "Bot" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "chatKey" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Bot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Bot_chatKey_key" ON "Bot"("chatKey");

-- AddForeignKey
ALTER TABLE "Article" ADD CONSTRAINT "Article_botId_fkey" FOREIGN KEY ("botId") REFERENCES "Bot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReadingProgress" ADD CONSTRAINT "ReadingProgress_currentBotId_fkey" FOREIGN KEY ("currentBotId") REFERENCES "Bot"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIInteraction" ADD CONSTRAINT "AIInteraction_botId_fkey" FOREIGN KEY ("botId") REFERENCES "Bot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
