/* eslint-disable @typescript-eslint/no-var-requires */
import { HttpException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import axios from 'axios';

@Injectable()
export class AIService {
  private DIFY_URL: string;
  private difyDatabaseKey: string;
  constructor(
    private configService: ConfigService,
    private readonly httpService: HttpService
  ) {
    this.DIFY_URL = this.configService.get<string>('DIFY_URL');
    this.difyDatabaseKey = this.configService.get<string>('DIFY_DATABASE_KEY');
    // 添加调试日志
    console.log('DIFY_URL:', this.DIFY_URL);
    console.log('DIFY_DATABASE_KEY:', this.difyDatabaseKey);

    // 添加验证
    if (!this.DIFY_URL) {
      throw new Error('DIFY_URL is not configured');
    }
    if (!this.difyDatabaseKey) {
      throw new Error('DIFY_DATABASE_KEY is not configured');
    }
  }
  // 创建dify知识库（空）
  async createLibrary(article_title: string) {
    const url = `${this.DIFY_URL}/v1/datasets`
    console.log("article_title", article_title);

    const options = {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.difyDatabaseKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        "name": article_title,
        "permission": "all_team_members"
      })
    };

    try {
      const response = await fetch(url, options);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      return data; // 返回API响应数据
    } catch (error) {
      console.error('Error:', error);
      throw error; // 重新抛出错误允许调用者处理它
    }
  }

  async createDocumentByText(datasetId: string, createDto) {
    try {
      const response = await axios({
        method: 'post',
        url: `${this.DIFY_URL}/v1/datasets/${datasetId}/document/create-by-text`,
        headers: {
          'Authorization': `Bearer ${this.difyDatabaseKey}`,
          'Content-Type': 'application/json',
        },
        data: createDto,
      });

      return response.data;
    } catch (error) {
      throw new HttpException(
        error.response?.data || 'Create document failed',
        error.response?.status || 500,
      );
    }
  }



  // 切换机器人
  async switchRobot() { }

  // 发送消息｜创建新的会话
  async sendMessage() { }
}
