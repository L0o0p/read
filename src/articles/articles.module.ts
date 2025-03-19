// src/articles/articles.module.ts
import { Module } from '@nestjs/common';
import { ArticlesService } from './articles.service';
import { PrismaService } from '../prisma/prisma.service';
import { ArticlesController } from './articles.controller';
import { UploadService } from './upload.service';

@Module({
  controllers: [ArticlesController],
  providers: [ArticlesService, PrismaService,UploadService],
  exports: [ArticlesService], // 如果其他模块需要使用 ArticlesService
})
export class ArticlesModule { }