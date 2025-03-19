import { BadRequestException, Body, Controller, Get, Post, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { ArticlesService } from './articles.service';
import { Roles } from 'src/auth/decorators/roles.decorator';
import {  Role } from '@prisma/client';
import { JwtAuthGuard } from 'src/auth/guards/jwtAuthGuard';
import { RolesGuard } from 'src/auth/guards/rolesGuard';
import { GetUser } from 'src/auth/decorators/get-user.decorator';
import { FileInterceptor } from '@nestjs/platform-express';
import { UploadService } from './upload.service';
import { PrismaService } from 'src/prisma/prisma.service';

@Controller('article')
export class ArticlesController {
  prisma: PrismaService
  constructor(
    private readonly appService: ArticlesService,
    private readonly uploadService: UploadService
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

        // 2. 保存到数据库
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
  // 批量上传
  // @Post('batch')
  // @UseInterceptors(FilesInterceptor('files'))
  // async batchCreateArticles(
  //   @UploadedFiles() files: Express.Multer.File[],
  // ) {
  //   return this.articleService.batchCreate(files);
  // }

}
