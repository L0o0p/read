import { Body, Controller, Post, UseInterceptors } from '@nestjs/common';
import { AIService } from './ai.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { CreateDocumentByTextDto } from './dto/createDocumentByTextDto';

@Controller('ai')
export class AIController {
  constructor(private readonly appService: AIService) { }

  // 创建知识库+机器人绑定
  @Post('create')
  async createLibrary() {
    return await this.appService.createLibrary('bbbbb');
  }

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file')
  ) // 如果需要文件上传
  @UseInterceptors(FileInterceptor('file'))
  async UploadFilesToLibrary(
    @Body() createDto: CreateDocumentByTextDto,
  ) {
    const datasetId = '0f1db44c-ca54-4f0f-997d-7bbcc3034959'
    return await this.appService.createDocumentByText(
      datasetId,
      createDto,
    );

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
