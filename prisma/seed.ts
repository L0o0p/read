// prisma/seed.ts
import { PrismaClient, Role, QuestionType, AIFeatureType } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    // 清理现有数据（按照外键依赖顺序）
    await prisma.$transaction([
        prisma.aIInteraction.deleteMany(),
        prisma.aIUsageStats.deleteMany(),
        prisma.answerRecord.deleteMany(),
        prisma.studyRound.deleteMany(),
        prisma.readingSession.deleteMany(),
        prisma.vocabulary.deleteMany(),
        prisma.wordFrequency.deleteMany(),
        prisma.articleScore.deleteMany(),
        prisma.question.deleteMany(),
        prisma.chatRecord.deleteMany(),
        prisma.readingProgress.deleteMany(),
        prisma.article.deleteMany(),
        prisma.user.deleteMany(),
    ]);

    // 创建用户
    const admin = await prisma.user.create({
        data: {
            code: '000001',
            nickname: 'Admin',
            role: Role.ADMIN,
        },
    });

    const teacher = await prisma.user.create({
        data: {
            code: '000002',
            nickname: 'Teacher',
            role: Role.TEACHER,
        },
    });

    const student = await prisma.user.create({
        data: {
            code: '000003',
            nickname: 'Student',
            role: Role.STUDENT,
        },
    });
    // 首先在数据库创建机器人数据
    const bots = [
        {
            name: 'sgytest Bot',
            chatKey: 'app-TkuEbnFy5sIdx1E901jvX8v9',
            description: 'sgy测试'
        },
        {
            name: 'test Bot',
            chatKey: 'app-zk6PfXvt8lEYgpQTFFs0BvHW',
            description: 'test'
        },
    ];

    // 创建机器人并存储它们的ID
    const createdBots = await Promise.all(
        bots.map(bot =>
            prisma.bot.upsert({
                where: { chatKey: bot.chatKey },
                update: bot,
                create: bot
            })
        )
    );

    console.log('Created bots:', createdBots);
    // 创建文章
    const article1 = await prisma.article.create({
        data: {
            order: 1,
            title: 'Introduction to English',
            content: 'This is the first article content...',
            contentHtml: "<p>这是示例文章1的内容...</p>", // 添加这个字段
            level: 1,
            category: 'Basic',
            knowledgeBaseId: 'kb_001',
            botId: createdBots[0].id,
        },
    });

    const article2 = await prisma.article.create({
        data: {
            order: 2,
            title: 'Intermediate English',
            content: 'This is the second article content...',
            contentHtml: "<p>这是示例文章2的内容...</p>", // 添加这个字段
            level: 2,
            category: 'Intermediate',
            knowledgeBaseId: 'kb_002',
            botId: createdBots[1].id,
        },
    });

    // 创建文章评分标准
    await prisma.articleScore.createMany({
        data: [
            {
                articleId: article1.id,
                totalScore: 100,
                scoreRules: {
                    exercise: 20,
                    supplementary: 10,
                },
            },
            {
                articleId: article2.id,
                totalScore: 100,
                scoreRules: {
                    exercise: 20,
                    supplementary: 10,
                },
            },
        ],
    });

    // 为每篇文章创建练习题和补充题
    for (const article of [article1, article2]) {
        // 练习题
        for (let i = 1; i <= 5; i++) {
            await prisma.question.create({
                data: {
                    articleId: article.id,
                    type: QuestionType.EXERCISE,
                    orderNumber: i,
                    content: `Exercise question ${i} for article ${article.order}`,
                    options: {
                        A: 'Option A',
                        B: 'Option B',
                        C: 'Option C',
                        D: 'Option D',
                    },
                    answer: 'A',
                    explanation: `Explanation for question ${i}`,
                },
            });
        }

        // 补充题
        for (let i = 1; i <= 5; i++) {
            await prisma.question.create({
                data: {
                    articleId: article.id,
                    type: QuestionType.SUPPLEMENTARY,
                    orderNumber: i,
                    content: `Supplementary question ${i} for article ${article.order}`,
                    options: {
                        A: 'Option A',
                        B: 'Option B',
                        C: 'Option C',
                        D: 'Option D',
                    },
                    answer: 'B',
                    explanation: `Explanation for supplementary question ${i}`,
                },
            });
        }
    }

    // 创建阅读进度
    const progress = await prisma.readingProgress.create({
        data: {
            userId: student.id,
            articleId: article1.id,
            progressPercent: 20,
        },
    });

    // 创建阅读会话
    const session = await prisma.readingSession.create({
        data: {
            userId: student.id,
            currentArticleId: article1.id,
            currentQuestionIndex: 1,
            currentRound: 1,
            currentQuestionType: "EXERCISE" as QuestionType,  // 确保类型正确
        },
    });

    // 创建学习轮次
    const round = await prisma.studyRound.create({
        data: {
            sessionId: session.id,
            roundNumber: 1,
            totalScore: 0,
            ReadingProgress: {
                connect: { id: progress.id },
            },
        },
    });

    // 创建一些词汇记录
    await prisma.vocabulary.createMany({
        data: [
            {
                word: 'hello',
                context: 'Hello world',
                userId: student.id,
                articleId: article1.id,
            },
            {
                word: 'world',
                context: 'Hello world',
                userId: student.id,
                articleId: article1.id,
            },
        ],
    });

    // 创建词频记录
    await prisma.wordFrequency.createMany({
        data: [
            {
                word: 'hello',
                frequency: 5,
                articleId: article1.id,
            },
            {
                word: 'world',
                frequency: 3,
                articleId: article1.id,
            },
        ],
    });

    // 创建 AI 使用统计
    await prisma.aIUsageStats.create({
        data: {
            userId: student.id,
            featureType: AIFeatureType.TRANSLATION,
            useCount: 10,
        },
    });

    // 2. 更新文章数据，添加机器人关联
    // 这里假设每篇文章按顺序循环使用这些机器人
    const updatedArticles = [article1, article2].map((article, index) => ({
        ...article,
        botId: createdBots[index % createdBots.length].id  // 循环分配机器人
    }));

    // 创建或更新文章
    for (const article of updatedArticles) {
        await prisma.article.upsert({
            where: { order: article.order },
            update: {
                ...article,
                botId: article.botId
            },
            create: {
                ...article,
                botId: article.botId
            }
        });
    }

    console.log('Articles updated with bot associations');

    console.log('Seed data created successfully');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });