// src/auth/auth.controller.ts
import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { CreateUserDto, LoginDto } from './dto/auth.dto';
import { GetUser } from './decorators/get-user.decorator';
import { Roles } from './decorators/roles.decorator';
import { AuthService } from './auth.service';
import { RolesGuard } from './guards/rolesGuard';
import { JwtAuthGuard } from './guards/jwtAuthGuard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) { }

  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Post('users')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.TEACHER)
  async createUser(
    @Body() createUserDto: CreateUserDto,
    @GetUser('id') teacherId: string,
  ) {
    return this.authService.createUser(createUserDto, teacherId);
  }

  // 可选：批量创建用户账号
  @Post('users/batch')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.TEACHER)
  async createUsers(
    @Body() dto: { count: number },
    @GetUser('id') teacherId: string,
  ) {
    const users = [];
    for (let i = 0; i < dto.count; i++) {
      const user = await this.authService.createUser({
        code: await this.authService.generateUniqueCode(),
        role: Role.STUDENT,
      }, teacherId);
      users.push(user);
    }
    return users;
  }
}