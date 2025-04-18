import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { AIService } from './ai.service';
import { createAppDto } from './dto/createAppDto';
import { GetUser } from 'src/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from 'src/auth/guards/jwtAuthGuard';

@Controller('ai')
export class AIController {
  constructor(
    private readonly appService: AIService,
  ) { }

  // 创建知识库+机器人绑定
  @Post('create')
  async createLibrary(
    @Body() createAppDto: createAppDto
  ) {
    return this.appService.createAppAndSetLibrary(createAppDto)
  }

  // // 切换机器人
  // async switchRobot() {
  //   return await this.appService.createLibrary();
  // }

  // 发送消息｜创建新的会话
  @Post('message')
  @UseGuards(JwtAuthGuard)
  async sendMessage(
    @GetUser('id') userId: string,
    @Body() message: { message: string }
  ) {
    return this.appService.message(message.message, userId)
  }

  // 更换要对话的机器人
  // 机器人信息跟article绑定，所以article切换时候会自动切换，不需要额外方法
}
