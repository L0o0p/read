// src/articles/articles.module.ts
import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PrismaModule } from 'src/prisma/prisma.module';
import { AIService } from './ai.service';
import { AIController } from './ai.controller';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [
    PrismaModule, // 导入 PrismaModule
    HttpModule,
  ],
  controllers: [AIController],
  providers: [AIService, PrismaService],
  exports: [AIService], // 如果其他模块需要使用 ArticlesService
})
export class AIsModule { }