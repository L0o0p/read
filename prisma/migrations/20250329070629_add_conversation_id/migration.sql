/*
  Warnings:

  - A unique constraint covering the columns `[userId,status]` on the table `ReadingSession` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "ReadingProgress" ADD COLUMN     "conversationId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "ReadingSession_userId_status_key" ON "ReadingSession"("userId", "status");
