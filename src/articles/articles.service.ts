import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, QuestionType } from '@prisma/client';
@Injectable()
export class ArticlesService {
  constructor(private prisma: PrismaService) { }
  getHello(): string {
    return 'Hello World!';
  }

  generateTimestamp() {
    const now = new Date();
    return now.toLocaleString()
  }

  async getProgress(userId: string) {
    // 先检查用户是否存在
    const user = await this.prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      throw new BadRequestException('用户不存在');
    }

    // 1. 获取用户最后阅读的文章进度及相关信息
    const lastProgress = await this.prisma.readingProgress.findFirst({
      where: { userId },
      orderBy: { lastReadAt: 'desc' },
      include: {
        article: {
          include: {
            questions: {
              orderBy: {
                orderNumber: 'asc'
              },
              select: {
                id: true,
                orderNumber: true,
                type: true,
                content: true,
                options: true,
                answer: true,
                explanation: true
              }
            }
          }
        },
      },
    });

    // 2. 获取当前会话信息
    const currentSession = await this.prisma.readingSession.findFirst({
      where: {
        userId,
        status: 'IN_PROGRESS'
      },
      include: {
        currentArticle: true,
        rounds: {
          where: {
            roundNumber: 1
          },
          take: 1
        }
      }
    });

    // 3. 如果没有进度或会话，创建新的阅读会话和进度
    if (!lastProgress || !currentSession) {
      // ... 创建新进度的代码保持不变 ...
    }

    // 4. 检查是否所有轮次都完成
    if (currentSession.currentRound > 4) {
      return {
        status: 'ALL_COMPLETED',
        message: '恭喜！你已完成所有学习内容',
        lastProgress,
        currentSession
      };
    }

    // 5. 计算当前题目信息
    const exerciseQuestions = lastProgress.article.questions.filter(q => q.type === 'EXERCISE');
    const supplementaryQuestions = lastProgress.article.questions.filter(q => q.type === 'SUPPLEMENTARY');

    // 检查是否已完成所有题目
    const currentQuestionIndex = currentSession.currentQuestionIndex || 1;
    const currentQuestionType = currentSession.currentQuestionType || 'EXERCISE';

    const isLastExerciseQuestion = currentQuestionType === 'EXERCISE' &&
      currentQuestionIndex > exerciseQuestions.length;
    const isLastSupplementaryQuestion = currentQuestionType === 'SUPPLEMENTARY' &&
      currentQuestionIndex > supplementaryQuestions.length;

    if (isLastExerciseQuestion || isLastSupplementaryQuestion) {
      return {
        status: 'ARTICLE_COMPLETED',
        message: '当前文章的所有题目已完成',
        lastProgress,
        currentSession,
        currentQuestionInfo: null
      };
    }

    // 6. 获取当前题目
    const currentQuestion = lastProgress.article.questions.find(q => {
      return q.type === currentQuestionType &&
        q.orderNumber === currentQuestionIndex;
    });

    // 7. 返回进度和当前题目信息
    return {
      status: 'IN_PROGRESS',
      ...lastProgress,
      currentQuestionInfo: currentQuestion ? {
        id: currentQuestion.id,
        questionNumber: currentQuestion.orderNumber,
        questionType: currentQuestion.type,
        content: currentQuestion.content,
        options: currentQuestion.options,
        totalQuestions: exerciseQuestions.length + supplementaryQuestions.length,
        remainingExercises: exerciseQuestions.length - currentQuestionIndex + 1,
        remainingSupplementary: supplementaryQuestions.length
      } : null,
      currentSession
    };
  }

  async getArticle(userId: string) {
    const progress = await this.getProgress(userId);

    // 如果已完成所有轮次
    if (progress.status === 'ALL_COMPLETED') {
      return progress.lastProgress.article;
    }

    // 如果当前文章已完成
    if (progress.status === 'ARTICLE_COMPLETED') {
      const nextArticle = await this.prisma.article.findFirst({
        where: {
          order: {
            gt: progress.currentSession.currentArticle.order,
          },
        },
        orderBy: {
          order: 'asc',
        },
      });

      if (nextArticle) {
        return nextArticle;
      }
    }

    // 返回当前进行中的文章
    return progress.currentSession.currentArticle;
  }

  async getArticleQuestions(articleId: string, type: QuestionType) {
    const questions = await this.prisma.question.findMany({
      where: {
        articleId,
        type,
      },
      orderBy: {
        orderNumber: 'asc',
      },
      select: {
        id: true,
        content: true,
        options: true,
        type: true,
        orderNumber: true,
        explanation: true,
        // 根据题目类型选择包含的关联数据
        ...(type === QuestionType.EXERCISE ? {
          mappedQuestions: {
            select: {
              id: true,
              content: true,
              options: true,
              explanation: true,
              type: true,
              orderNumber: true,
            }
          }
        } : {
          relatedQuestion: {
            select: {
              id: true,
              content: true,
              options: true,
              explanation: true,
              type: true,
              orderNumber: true,
            }
          }
        })
      }
    });

    return questions;
  }

  async getRoundScore(userId: string) {
    const progress = await this.getProgress(userId);
    const currentRound = progress.currentSession.rounds[0];

    if (!currentRound) {
      return {
        totalScore: 0,
        maxPossibleScore: 10,
        completionRate: 0
      };
    }

    // 获取本轮答题记录
    const answers = await this.prisma.answerRecord.findMany({
      where: {
        roundId: currentRound.id
      },
      include: {
        question: true
      }
    });

    const totalScore = currentRound.totalScore;
    const maxPossibleScore = 10; // 每篇文章5分，共2篇

    return {
      totalScore,
      maxPossibleScore,
      completionRate: (totalScore / maxPossibleScore) * 100,
      answeredQuestions: answers.length,
      correctAnswers: answers.filter(a => a.isCorrect).length
    };
  }

  async checkAnswer(questionId: string, answer: string, userId: string) {
    // 获取当前进度和会话信息
    const progress = await this.getProgress(userId);

    if (progress.status === 'ALL_COMPLETED' || progress.status === 'ARTICLE_COMPLETED') {
      throw new Error('Cannot submit answer: session or article already completed');
    }

    const currentRound = progress.currentSession.rounds[0];

    // 获取题目信息
    const question = await this.prisma.question.findUnique({
      where: { id: questionId },
      include: {
        mappedQuestions: true,
      }
    });

    if (!question) {
      throw new Error('Question not found');
    }

    const isCorrect = question.answer === answer;
    const score = isCorrect ? 20 : 0; // 每题20分

    // 创建答题记录
    const answerRecord = await this.prisma.answerRecord.create({
      data: {
        roundId: currentRound.id,
        questionId,
        answer,
        isCorrect,
        score,
        articleOrder: progress.currentSession.currentArticle.order,
        timeSpent: 60, // 假设用时60秒
        ReadingProgress: {
          connect: {
            id: progress.lastProgress.id
          }
        }
      }
    });

    // 如果答对了，更新轮次总分
    if (isCorrect) {
      await this.prisma.studyRound.update({
        where: { id: currentRound.id },
        data: {
          totalScore: {
            increment: 20
          }
        }
      });
    }

    // 如果是练习题且答错了，返回对应的补充题
    let supplementaryQuestion = null;
    if (question.type === QuestionType.EXERCISE && !isCorrect && question.mappedQuestions.length > 0) {
      supplementaryQuestion = question.mappedQuestions[0];
    }

    return {
      isCorrect,
      score,
      supplementaryQuestion,
      explanation: question.explanation,
      answerRecord
    };
  }

  async processingAnswers(userId: string, answer: string) {
    // 获取当前进度（如果是新用户会自动创建初始进度）
    const { currentSession } = await this.getProgress(userId);

    if (!currentSession) {
      throw new Error('No active reading session found');
    }

    // 获取当前题目
    const currentQuestion = await this.prisma.question.findUnique({
      where: {
        articleId_type_orderNumber: {
          articleId: currentSession.currentArticleId,
          type: currentSession.currentQuestionType,
          orderNumber: currentSession.currentQuestionIndex || 1
        }
      }
    });

    // 3. 如果找不到当前题目，说明当前文章的题目已经答完
    if (!currentQuestion) {
      // 查找下一篇文章
      const nextArticle = await this.prisma.article.findFirst({
        where: {
          order: {
            gt: currentSession.currentArticle!.order
          }
        },
        orderBy: {
          order: 'asc'
        }
      });

      if (nextArticle) {
        // 更新会话到下一篇文章
        const updatedSession = await this.prisma.readingSession.update({
          where: {
            id: currentSession.id
          },
          data: {
            currentArticleId: nextArticle.id,
            currentQuestionIndex: 1,
            currentQuestionType: 'EXERCISE'
          }
        });

        // 获取或创建新文章的进度记录
        const newProgress = await this.prisma.readingProgress.upsert({
          where: {
            userId_articleId: {
              userId,
              articleId: nextArticle.id
            }
          },
          create: {
            userId,
            articleId: nextArticle.id,
            progressPercent: 0
          },
          update: {}
        });

        return {
          status: 'NEXT_ARTICLE',
          nextArticle,
          newProgress,
          updatedSession
        };
      } else {
        // 检查是否需要进入下一轮
        if (currentSession.currentRound < 4) {
          // 获取第一篇文章
          const firstArticle = await this.prisma.article.findFirst({
            orderBy: {
              order: 'asc'
            }
          });

          if (!firstArticle) {
            throw new Error('No articles found in the database');
          }

          // 创建新的学习轮次
          const newRound = await this.prisma.studyRound.create({
            data: {
              sessionId: currentSession.id,
              roundNumber: currentSession.currentRound + 1
            }
          });

          // 更新会话状态
          const updatedSession = await this.prisma.readingSession.update({
            where: {
              id: currentSession.id
            },
            data: {
              currentRound: currentSession.currentRound + 1,
              currentArticleId: firstArticle.id,
              currentQuestionIndex: 1,
              currentQuestionType: 'EXERCISE'
            }
          });

          return {
            status: 'NEXT_ROUND',
            newRound,
            firstArticle,
            updatedSession
          };
        } else {
          // 所有轮次都完成，结束会话
          const completedSession = await this.prisma.readingSession.update({
            where: {
              id: currentSession.id
            },
            data: {
              status: 'COMPLETED',
              endTime: new Date()
            }
          });

          return {
            status: 'SESSION_COMPLETED',
            completedSession
          };
        }
      }
    }

    // 4. 处理答题
    const isCorrect = currentQuestion.answer === answer;
    let nextQuestionType: QuestionType = 'EXERCISE';

    // 获取当前进度
    const progress = await this.prisma.readingProgress.findUnique({
      where: {
        userId_articleId: {
          userId,
          articleId: currentSession.currentArticleId
        }
      }
    });

    if (!progress) {
      throw new Error('Reading progress not found');
    }

    // 更新进度逻辑
    let newProgressPercent = progress.progressPercent;

    if (currentQuestion.type === 'EXERCISE') {
      if (isCorrect) {
        // 答对练习题：进度+20，保持EXERCISE类型
        newProgressPercent = Math.min(progress.progressPercent + 20, 100);
      } else {
        // 答错练习题：进度不变，切换到SUPPLEMENTARY类型
        nextQuestionType = 'SUPPLEMENTARY';
      }
    } else if (currentQuestion.type === 'SUPPLEMENTARY') {
      // 补充题无论对错：进度+20，切换回EXERCISE类型
      newProgressPercent = Math.min(progress.progressPercent + 20, 100);
      nextQuestionType = 'EXERCISE';
    }

    // 5. 创建答题记录
    const answerRecord = await this.prisma.answerRecord.create({
      data: {
        roundId: currentSession.rounds[0].id,  // 使用当前轮次
        questionId: currentQuestion.id,
        answer,
        isCorrect,
        score: isCorrect ? 20 : 0,
        articleOrder: currentSession.currentArticle!.order,
        timeSpent: 60, // 假设用时60秒
        ReadingProgress: {
          connect: {
            id: progress.id
          }
        }
      }
    });

    // 6. 更新进度
    const updatedProgress = await this.prisma.readingProgress.update({
      where: {
        id: progress.id
      },
      data: {
        progressPercent: newProgressPercent,
        lastReadAt: new Date(),
      }
    });

    // 7. 更新会话
    const updatedSession = await this.prisma.readingSession.update({
      where: {
        id: currentSession.id
      },
      data: {
        currentQuestionType: nextQuestionType,
        currentQuestionIndex: (currentQuestion.type === 'EXERCISE' && isCorrect) ||
          currentQuestion.type === 'SUPPLEMENTARY'
          ? (currentSession.currentQuestionIndex || 1) + 1
          : currentSession.currentQuestionIndex
      }
    });

    // 8. 更新轮次总分
    const updatedRound = await this.prisma.studyRound.update({
      where: {
        id: currentSession.rounds[0].id
      },
      data: {
        totalScore: {
          increment: isCorrect ? 20 : 0
        }
      }
    });

    // 9. 返回处理结果
    return {
      status: 'ANSWER_PROCESSED',
      isCorrect,
      score: isCorrect ? 20 : 0,
      newProgressPercent,
      nextQuestionType,
      answerRecord,
      explanation: currentQuestion.explanation,
      updatedProgress,
      updatedSession,
      updatedRound
    };
  }
  // async saveAllContent(sections: any, htmlContent: string) {
  //   try {
  //     // 1. 先保存文章
  //     console.log('开始保存文章...');
  //     const article = await this.prisma.article.create({
  //       data: {
  //         title: sections.title,
  //         content: sections.article,
  //         contentHtml: htmlContent,
  //         level: 1,
  //         category: 'reading',
  //         order: await this.getNextArticleOrder(),
  //         knowledgeBaseId: 'default',
  //         botId: 'default',
  //       }
  //     });
  //     console.log('文章保存成功，ID:', article.id);

  //     // 2. 保存练习题
  //     console.log('开始保存练习题...');
  //     const exercisePromises = sections.exercises.map((question: any) =>
  //       this.prisma.question.create({
  //         data: {
  //           articleId: article.id,
  //           type: 'EXERCISE',
  //           orderNumber: question.orderNumber,
  //           content: question.content,
  //           options: question.options,
  //           answer: question.answer,
  //           explanation: question.explanation
  //         }
  //       })
  //     );
  //     await Promise.all(exercisePromises);
  //     console.log('练习题保存成功');

  //     // 3. 保存跟踪练习
  //     console.log('开始保存跟踪练习...');
  //     const trackingPromises = sections.tracking.map((question: any) =>
  //       this.prisma.question.create({
  //         data: {
  //           articleId: article.id,
  //           type: 'SUPPLEMENTARY',
  //           orderNumber: question.orderNumber,
  //           content: question.content,
  //           options: question.options,
  //           answer: question.answer,
  //           explanation: question.explanation
  //         }
  //       })
  //     );
  //     await Promise.all(trackingPromises);
  //     console.log('跟踪练习保存成功');

  //     // 4. 保存评分标准
  //     console.log('开始保存评分标准...');
  //     await this.prisma.articleScore.create({
  //       data: {
  //         articleId: article.id,
  //         totalScore: 100,
  //         scoreRules: {
  //           exerciseQuestions: 10,
  //           trackingQuestions: 10,
  //           totalPossible: 100
  //         }
  //       }
  //     });
  //     console.log('评分标准保存成功');

  //     return {
  //       success: true,
  //       articleId: article.id,
  //       message: '文章和题目上传成功',
  //       statistics: {
  //         exerciseCount: sections.exercises.length,
  //         trackingCount: sections.tracking.length
  //       }
  //     };

  //   } catch (error) {
  //     console.error('数据保存失败:', error);
  //     throw new BadRequestException(`保存数据失败: ${error.message}`);
  //   }
  // }

  async saveAllContent(
    sections: any,
    htmlContent: string,
    tx?: Prisma.TransactionClient // 添加可选的事务参数
  ) {
    // 使用传入的事务实例或默认的 prisma 实例
    const prisma = tx || this.prisma;

    try {
      // 1. 获取下一个序号
      const lastArticle = await prisma.article.findFirst({
        orderBy: { order: 'desc' }
      });
      const nextOrder = (lastArticle?.order || 0) + 1;

      // 2. 保存文章
      const article = await prisma.article.create({
        data: {
          title: sections.title,
          content: sections.article,
          contentHtml: htmlContent,
          level: 1,
          category: 'reading',
          order: nextOrder,
          knowledgeBaseId: 'default',
          botId: 'default',
        }
      });

      // 3. 批量保存练习题
      if (sections.exercises?.length) {
        await prisma.question.createMany({
          data: sections.exercises.map(question => ({
            articleId: article.id,
            type: 'EXERCISE',
            orderNumber: question.orderNumber,
            content: question.content,
            options: question.options,
            answer: question.answer,
            explanation: question.explanation
          }))
        });
      }

      // 4. 批量保存跟踪练习
      if (sections.tracking?.length) {
        await prisma.question.createMany({
          data: sections.tracking.map(question => ({
            articleId: article.id,
            type: 'SUPPLEMENTARY',
            orderNumber: question.orderNumber,
            content: question.content,
            options: question.options,
            answer: question.answer,
            explanation: question.explanation
          }))
        });
      }

      // 5. 保存评分标准
      await prisma.articleScore.create({
        data: {
          articleId: article.id,
          totalScore: 100,
          scoreRules: {
            exerciseQuestions: 10,
            trackingQuestions: 10,
            totalPossible: 100
          }
        }
      });

      return {
        success: true,
        articleId: article.id,
        message: '文章和题目上传成功',
        statistics: {
          exerciseCount: sections.exercises?.length || 0,
          trackingCount: sections.tracking?.length || 0
        }
      };

    } catch (error) {
      console.error('数据保存失败:', error);
      throw new BadRequestException(`保存数据失败: ${error.message}`);
    }
  }


  private async getNextArticleOrder(): Promise<number> {
    const lastArticle = await this.prisma.article.findFirst({
      orderBy: { order: 'desc' },
    });
    const nextOrder = (lastArticle?.order || 0) + 1;
    console.log('下一个文章序号:', nextOrder);
    return nextOrder;
  }

}