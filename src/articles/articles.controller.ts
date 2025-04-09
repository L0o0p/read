import { BadRequestException, Body, Controller, Get, Post, UploadedFile, UploadedFiles, UseGuards, UseInterceptors } from '@nestjs/common';
import { ArticlesService } from './articles.service';
import { Roles } from 'src/auth/decorators/roles.decorator';
import {  Role } from '@prisma/client';
import { JwtAuthGuard } from 'src/auth/guards/jwtAuthGuard';
import { RolesGuard } from 'src/auth/guards/rolesGuard';
import { GetUser } from 'src/auth/decorators/get-user.decorator';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { UploadService } from './upload.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { AIService } from 'src/ai/ai.service';

@Controller('article')
export class ArticlesController {
  constructor(
    private readonly appService: ArticlesService,
    private readonly uploadService: UploadService,
    private readonly prisma: PrismaService, 
    private readonly ai: AIService
  ) { }

  @Get('test')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.TEACHER)
  getHello(): string {
    return this.appService.getHello();
  }
  @Get('app')
  @UseGuards(JwtAuthGuard)
  async getStaticResources(@GetUser('id') userId: string): Promise<any> {
    // 获取进度
    const progress = await this.appService.getProgress(userId);

    // 根据进度状态返回不同的数据
    if (progress.status === 'ALL_COMPLETED') {
      return {
        status: 'ALL_COMPLETED',
        message: progress.message,
        lastProgress: progress.lastProgress,
        currentSession: progress.currentSession,
        time: this.appService.generateTimestamp()
      };
    }

    if (progress.status === 'ARTICLE_COMPLETED') {
      // 获取下一篇文章
      const nextArticle = await this.prisma.article.findFirst({
        where: {
          order: {
            gt: progress.currentSession.currentArticle.order
          }
        },
        orderBy: {
          order: 'asc'
        }
      });

      return {
        status: 'ARTICLE_COMPLETED',
        message: progress.message,
        progress: progress,
        nextArticle,
        roundScore: await this.appService.getRoundScore(userId),
        time: this.appService.generateTimestamp()
      };
    }

    // 常规进行中的状态
    const article = await this.appService.getArticle(userId);
    const exercise = await this.appService.getArticleQuestions(article.id, 'EXERCISE');
    const roundScore = await this.appService.getRoundScore(userId);

    return {
      status: 'IN_PROGRESS',
      progress: progress,
      chatHistory: '',
      article: article,
      exercise: exercise,
      roundScore: roundScore,
      time: this.appService.generateTimestamp(),
    };
  }

  @Post('submit-answer')
  @UseGuards(JwtAuthGuard)
  async submitAnswer(
    @Body() dto: { answer: string },
    @GetUser('id') userId: any
  ) {
    const feedback = this.appService.processingAnswers(userId, dto.answer)
    return feedback
  }

  @Get('nextArticle')
  @UseGuards(JwtAuthGuard)
  async getNextArticle(@GetUser('id') userId: string): Promise<any> {
    await this.getStaticResources(userId)
    return await this.getStaticResources(userId)
  }

  @Post('upload')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @UseInterceptors(FileInterceptor('file')) // 如果需要文件上传
  async createArticle(
    @UploadedFile() file: Express.Multer.File,
  ) {
    try {
      // 1. 处理文件
      let processedData;
      let htmlContent;

      if (file) {
        processedData = await this.uploadService.processDocxUpload(file);
        htmlContent = await this.uploadService.convertArticleToHtml(file);

        // 2. 上传到dify创建知识库,如果创建成功才保存本地
        // this.ai.createLibrary(processedData.sections)

        // 3. 保存到数据库
        const result = await this.appService.saveAllContent(
          processedData.sections,  // 注意这里需要使用 processedData.sections
          htmlContent
        );

        return result;
      }

      return {
        success: false,
        message: '没有收到文件'
      };
    } catch (error) {
      console.error('Upload error:', error);
      throw new BadRequestException(`上传处理失败: ${error.message}`);
    }
  }
  
@Post('upload/batch')
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(FilesInterceptor('file', 10)) // 最多10个文件
async batchCreateArticles(
  @UploadedFiles() files: Express.Multer.File[],
) {
  if (!files || files.length === 0) {
    return {
      success: false,
      message: '没有收到文件'
    };
  }

  const results = [];
  const errors = [];

  // 使用 Prisma 事务处理所有文件
  await this.prisma.$transaction(async (tx) => {
    for (const file of files) {
      try {
        // 1. 处理文件
        const processedData = await this.uploadService.processDocxUpload(file);
        const htmlContent = await this.uploadService.convertArticleToHtml(file);

        // 2. 保存到数据库
        const result = await this.appService.saveAllContent(
          processedData.sections,
          htmlContent,
          tx // 传入事务实例
        );

        results.push({
          filename: file.originalname,
          ...result
        });
      } catch (error) {
        console.error(`处理文件 ${file.originalname} 失败:`, error);
        errors.push({
          filename: file.originalname,
          error: error.message
        });
      }
    }
  });

  return {
    success: true,
    totalProcessed: files.length,
    successCount: results.length,
    errorCount: errors.length,
    results,
    errors
  };
}

}
