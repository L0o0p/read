import { Body, Controller, Post } from '@nestjs/common';
import { AIService } from './ai.service';
import { createAppDto } from './dto/createAppDto';

@Controller('ai')
export class AIController {
  constructor(private readonly appService: AIService) { }

  // 创建知识库+机器人绑定
  @Post('create')
  async createLibrary(
    @Body() createAppDto: createAppDto
  ) {
    return this.appService.createBotAndSetLibrary(createAppDto)
  }

  // // 切换机器人
  // async switchRobot() {
  //   return await this.appService.createLibrary();
  // }

  // // 发送消息｜创建新的会话
  // async sendMessage() {
  //   return await this.appService.createLibrary();
  // }


}
