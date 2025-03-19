-- CreateEnum
CREATE TYPE "Role" AS ENUM ('STUDENT', 'TEACHER', 'ADMIN');

-- CreateEnum
CREATE TYPE "QuestionType" AS ENUM ('EXERCISE', 'SUPPLEMENTARY');

-- CreateEnum
CREATE TYPE "AIFeatureType" AS ENUM ('TRANSLATION', 'GRAMMAR', 'QUESTION_HINT', 'GENERAL_CHAT', 'VOCABULARY_HELP');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "code" CHAR(6) NOT NULL,
    "nickname" TEXT,
    "role" "Role" NOT NULL DEFAULT 'STUDENT',
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Article" (
    "id" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "contentHtml" TEXT NOT NULL,
    "level" INTEGER NOT NULL,
    "category" TEXT NOT NULL,
    "knowledgeBaseId" TEXT NOT NULL,
    "botId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Article_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReadingProgress" (
    "id" TEXT NOT NULL,
    "progressPercent" INTEGER NOT NULL DEFAULT 0,
    "lastReadAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    "articleId" TEXT NOT NULL,

    CONSTRAINT "ReadingProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatRecord" (
    "id" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "response" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    "articleId" TEXT NOT NULL,

    CONSTRAINT "ChatRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Question" (
    "id" TEXT NOT NULL,
    "articleId" TEXT NOT NULL,
    "type" "QuestionType" NOT NULL,
    "orderNumber" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "options" JSONB,
    "answer" TEXT NOT NULL,
    "explanation" TEXT NOT NULL,
    "relatedQuestionId" TEXT,

    CONSTRAINT "Question_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReadingSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endTime" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'IN_PROGRESS',
    "currentRound" INTEGER NOT NULL DEFAULT 1,
    "currentArticleId" TEXT,
    "currentQuestionIndex" INTEGER,
    "currentQuestionType" "QuestionType" NOT NULL DEFAULT 'EXERCISE',

    CONSTRAINT "ReadingSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudyRound" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "roundNumber" INTEGER NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endTime" TIMESTAMP(3),
    "totalScore" INTEGER NOT NULL DEFAULT 0,
    "firstArticleCompleted" BOOLEAN NOT NULL DEFAULT false,
    "secondArticleCompleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "StudyRound_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnswerRecord" (
    "id" TEXT NOT NULL,
    "roundId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "isCorrect" BOOLEAN NOT NULL,
    "score" INTEGER NOT NULL,
    "answeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "articleOrder" INTEGER NOT NULL,
    "attemptCount" INTEGER NOT NULL DEFAULT 1,
    "timeSpent" INTEGER NOT NULL,

    CONSTRAINT "AnswerRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vocabulary" (
    "id" TEXT NOT NULL,
    "word" TEXT NOT NULL,
    "context" TEXT NOT NULL,
    "reviewCount" INTEGER NOT NULL DEFAULT 0,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    "articleId" TEXT NOT NULL,

    CONSTRAINT "Vocabulary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WordFrequency" (
    "id" TEXT NOT NULL,
    "word" TEXT NOT NULL,
    "frequency" INTEGER NOT NULL,
    "articleId" TEXT NOT NULL,

    CONSTRAINT "WordFrequency_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ArticleScore" (
    "id" TEXT NOT NULL,
    "articleId" TEXT NOT NULL,
    "totalScore" INTEGER NOT NULL,
    "scoreRules" JSONB NOT NULL,

    CONSTRAINT "ArticleScore_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIInteraction" (
    "id" TEXT NOT NULL,
    "featureType" "AIFeatureType" NOT NULL,
    "inputText" TEXT NOT NULL,
    "response" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,
    "userId" TEXT NOT NULL,
    "articleId" TEXT NOT NULL,
    "progressId" TEXT NOT NULL,

    CONSTRAINT "AIInteraction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIUsageStats" (
    "id" TEXT NOT NULL,
    "featureType" "AIFeatureType" NOT NULL,
    "useCount" INTEGER NOT NULL DEFAULT 0,
    "lastUsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,

    CONSTRAINT "AIUsageStats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_ReadingProgressToStudyRound" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_ReadingProgressToStudyRound_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_AnswerRecordToReadingProgress" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_AnswerRecordToReadingProgress_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_code_key" ON "User"("code");

-- CreateIndex
CREATE INDEX "User_code_idx" ON "User"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Article_order_key" ON "Article"("order");

-- CreateIndex
CREATE INDEX "Article_title_idx" ON "Article"("title");

-- CreateIndex
CREATE INDEX "Article_level_category_idx" ON "Article"("level", "category");

-- CreateIndex
CREATE INDEX "ReadingProgress_userId_lastReadAt_idx" ON "ReadingProgress"("userId", "lastReadAt");

-- CreateIndex
CREATE UNIQUE INDEX "ReadingProgress_userId_articleId_key" ON "ReadingProgress"("userId", "articleId");

-- CreateIndex
CREATE INDEX "ChatRecord_userId_articleId_createdAt_idx" ON "ChatRecord"("userId", "articleId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Question_articleId_type_orderNumber_key" ON "Question"("articleId", "type", "orderNumber");

-- CreateIndex
CREATE INDEX "ReadingSession_userId_startTime_idx" ON "ReadingSession"("userId", "startTime");

-- CreateIndex
CREATE UNIQUE INDEX "StudyRound_sessionId_roundNumber_key" ON "StudyRound"("sessionId", "roundNumber");

-- CreateIndex
CREATE INDEX "AnswerRecord_roundId_answeredAt_idx" ON "AnswerRecord"("roundId", "answeredAt");

-- CreateIndex
CREATE INDEX "Vocabulary_userId_word_idx" ON "Vocabulary"("userId", "word");

-- CreateIndex
CREATE INDEX "WordFrequency_articleId_frequency_idx" ON "WordFrequency"("articleId", "frequency");

-- CreateIndex
CREATE INDEX "AIInteraction_userId_featureType_createdAt_idx" ON "AIInteraction"("userId", "featureType", "createdAt");

-- CreateIndex
CREATE INDEX "AIInteraction_progressId_featureType_idx" ON "AIInteraction"("progressId", "featureType");

-- CreateIndex
CREATE UNIQUE INDEX "AIUsageStats_userId_featureType_key" ON "AIUsageStats"("userId", "featureType");

-- CreateIndex
CREATE INDEX "_ReadingProgressToStudyRound_B_index" ON "_ReadingProgressToStudyRound"("B");

-- CreateIndex
CREATE INDEX "_AnswerRecordToReadingProgress_B_index" ON "_AnswerRecordToReadingProgress"("B");

-- AddForeignKey
ALTER TABLE "ReadingProgress" ADD CONSTRAINT "ReadingProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReadingProgress" ADD CONSTRAINT "ReadingProgress_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "Article"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatRecord" ADD CONSTRAINT "ChatRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatRecord" ADD CONSTRAINT "ChatRecord_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "Article"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "Article"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_relatedQuestionId_fkey" FOREIGN KEY ("relatedQuestionId") REFERENCES "Question"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReadingSession" ADD CONSTRAINT "ReadingSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReadingSession" ADD CONSTRAINT "ReadingSession_currentArticleId_fkey" FOREIGN KEY ("currentArticleId") REFERENCES "Article"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudyRound" ADD CONSTRAINT "StudyRound_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ReadingSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnswerRecord" ADD CONSTRAINT "AnswerRecord_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "StudyRound"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnswerRecord" ADD CONSTRAINT "AnswerRecord_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vocabulary" ADD CONSTRAINT "Vocabulary_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vocabulary" ADD CONSTRAINT "Vocabulary_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "Article"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WordFrequency" ADD CONSTRAINT "WordFrequency_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "Article"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArticleScore" ADD CONSTRAINT "ArticleScore_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "Article"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIInteraction" ADD CONSTRAINT "AIInteraction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIInteraction" ADD CONSTRAINT "AIInteraction_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "Article"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIInteraction" ADD CONSTRAINT "AIInteraction_progressId_fkey" FOREIGN KEY ("progressId") REFERENCES "ReadingProgress"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIUsageStats" ADD CONSTRAINT "AIUsageStats_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ReadingProgressToStudyRound" ADD CONSTRAINT "_ReadingProgressToStudyRound_A_fkey" FOREIGN KEY ("A") REFERENCES "ReadingProgress"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ReadingProgressToStudyRound" ADD CONSTRAINT "_ReadingProgressToStudyRound_B_fkey" FOREIGN KEY ("B") REFERENCES "StudyRound"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_AnswerRecordToReadingProgress" ADD CONSTRAINT "_AnswerRecordToReadingProgress_A_fkey" FOREIGN KEY ("A") REFERENCES "AnswerRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_AnswerRecordToReadingProgress" ADD CONSTRAINT "_AnswerRecordToReadingProgress_B_fkey" FOREIGN KEY ("B") REFERENCES "ReadingProgress"("id") ON DELETE CASCADE ON UPDATE CASCADE;
