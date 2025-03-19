// src/auth/auth.service.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import * as bcrypt from 'bcrypt';
import { CreateUserDto, LoginDto } from './dto/auth.dto';
import { AIFeatureType, Role } from '@prisma/client';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    
  ) { }

  async login(loginDto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { code: loginDto.code.toUpperCase() },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid code');
    }

    // 更新登录时间
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // 获取AI使用统计
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const aiStats = await this.prisma.aIUsageStats.findMany({
      where: { userId: user.id },
    });

    const token = this.generateToken(user);

    return {
      accessToken: token,
      user: {
        id: user.id,
        code: user.code,
        nickname: user.nickname,
        role: user.role,
        lastLoginAt: new Date(),
      },
    };
  }

  // 教师创建用户账号
  async createUser(createUserDto: CreateUserDto, creatorId: string) {
    // 验证创建者是否为教师
    const creator = await this.prisma.user.findUnique({
      where: { id: creatorId },
    });

    if (creator.role !== Role.TEACHER) {
      throw new UnauthorizedException('Only teachers can create users');
    }

    // 生成唯一的6位代码（如果提供的代码已存在）
    let code = createUserDto.code.toUpperCase();
    if (await this.prisma.user.findUnique({ where: { code } })) {
      code = await this.generateUniqueCode();
    }

    // 创建用户
    const user = await this.prisma.$transaction(async (prisma) => {
      // 创建用户基本信息
      const newUser = await prisma.user.create({
        data: {
          code,
          nickname: createUserDto.nickname,
          role: createUserDto.role,
        },
      });

      // 初始化AI使用统计
      await prisma.aIUsageStats.createMany({
        data: Object.values(AIFeatureType).map(featureType => ({
          userId: newUser.id,
          featureType,
          useCount: 0,
        })),
      });

      // 假设有初始文章ID
      const firstArticle = await prisma.article.findFirst({
        where: { order: 1 } // 或其他条件找到第一篇文章
      });

      if (firstArticle) {
        await prisma.readingProgress.create({
          data: {
            userId: newUser.id,
            articleId: firstArticle.id,
            progressPercent: 0
          },
        });
      }

      return newUser;
    });

    return user;
  }

  // 生成唯一的6位代码
  async generateUniqueCode(): Promise<string> {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code: string;
    let exists: boolean;

    do {
      code = Array.from(
        { length: 6 },
        () => chars.charAt(Math.floor(Math.random() * chars.length))
      ).join('');

      exists = await this.prisma.user.findUnique({
        where: { code }
      }) !== null;
    } while (exists);

    return code;
  }

  private generateToken(user: any) {
    return this.jwtService.sign({
      sub: user.id,
      username: user.username,
      role: user.role,
    });
  }

}