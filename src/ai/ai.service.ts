/* eslint-disable @typescript-eslint/no-var-requires */
import { HttpException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { ConversationResult, createAppDto } from './dto/createAppDto';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class AIService {
  private DIFY_URL: string;
  private difyDatabaseKey: string;
  private DIFY_API_KEY: string;
  constructor(
    private configService: ConfigService,
    private readonly prisma: PrismaService,

  ) {
    this.DIFY_URL = this.configService.get<string>('DIFY_URL');
    this.difyDatabaseKey = this.configService.get<string>('DIFY_DATABASE_KEY');
    this.DIFY_API_KEY = this.configService.get<string>('DIFY_API_KEY');

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

  // 发送消息｜创建新的会话
  async message(message: string, userId: string) {
    const chatKey = (await this.getCurrentBot(userId)).data.bot.chatKey

    const getConversantionIdResult = await this.getCurrentConversationId(userId); if (!getConversantionIdResult) return
    const feedback = await this.sendMessage(message, userId, chatKey, getConversantionIdResult.conversationId,)
    const updateConversantionIdResult = await this.updateConversationId(userId, feedback.conversation_id)
    return {
      getConversantionIdResult: getConversantionIdResult,
      feedback: feedback,
      updateConversantionIdResult: updateConversantionIdResult
    }
  }

  async sendMessage(
    message: string,
    userName: string,
    chatKey: string,
    conversation_id?: string,
  ) {
    const url = `${this.DIFY_URL}/v1/chat-messages`
    const options = {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${chatKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        "inputs": {},
        "query": message,
        "response_mode": "blocking",
        "conversation_id": conversation_id ? conversation_id : "",
        "user": userName,
        "files": []
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

  async getCurrentConversationId(userId: string): Promise<ConversationResult> {
    try {
      const progress = await this.prisma.readingProgress.findFirst({
        where: {
          userId,
        },
        orderBy: {
          lastReadAt: 'desc',
        },
        select: {
          conversationId: true,
        },
      });

      return {
        success: true,
        message: '成功获取会话ID',
        conversationId: progress?.conversationId ?? null
      };
    } catch (error) {
      console.error('Error getting conversationId:', error);
      throw error;
    }
  }

  async updateConversationId(userId: string, conversationId: string): Promise<ConversationResult> {
    try {
      const latestProgress = await this.prisma.readingProgress.findFirst({
        where: {
          userId,
        },
        orderBy: {
          lastReadAt: 'desc',
        },
      });

      if (!latestProgress) {
        throw new Error('No reading progress found for user');
      }

      const updated = await this.prisma.readingProgress.update({
        where: {
          id: latestProgress.id,
        },
        data: {
          conversationId,
          lastReadAt: new Date(),
        },
      });
      return {
        success: true,
        message: '成功更新会话ID',
        conversationId: updated.conversationId,
      };
    } catch (error) {
      console.error('Error updating conversationId:', error);
      throw error;
    }
  }

  async createAppAndSetLibrary(createAppDto: createAppDto) {
    const app = createAppDto.app
    const doc = createAppDto.doc
    const datasetId = (await this.createLibraryByArticle(doc)).id
    const appId = (await this.createApp(app)).id
    return await this.setLibraryForApp(appId, datasetId)
  }

  // 创建空白聊天机器人
  async createApp(app: { name: string }) {
    const url = `${this.DIFY_URL}/console/api/apps`
    console.log(url);

    const options = {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.DIFY_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        "name": app.name,
        "icon_type": "emoji",
        "icon": "📖",
        "icon_background": "#FFEAD5",
        "mode": "chat",
        "description": "read"
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

  // 给机器人绑定知识库
  async setLibraryForApp(appId: string, datasetId: string) {
    const url = `${this.DIFY_URL}/console/api/apps/${appId}/model-config`
    const pre_prompt = `现在你是一个中国小学生的英文阅读理解题目讲解老师，向你提问的用户都是你教授的小学生，请你仅根据提供的英文短文内容以及小学生对你的提问进行题目和语法知识的讲解。但是，需要注意的是:
1. 你不能直接为小学生们提供太长的翻译服务（一次最多只能翻译文中一个句子），你需要耐心的告诉他们你只能告诉他们大意不能直接提供打断翻译，因为这样不利于提高孩子们的阅读理水平。
2. 为了便于小学生阅读和理解，你必须回答得言简意赅、格式工整。每次回答得内容尽量不要超过200字（需要引用原文的部分除外），；内容比较多或者是有选项的内容的话最好能够另起一行。
3. 如果学生向你提出「原文依据」或者「在原文哪里可以找到答案」之类的问题，请尽可能给出原文。`
    const options = {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.DIFY_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        "pre_prompt": pre_prompt,
        "prompt_type": "simple",
        "chat_prompt_config": {},
        "completion_prompt_config": {},
        "user_input_form": [],
        "dataset_query_variable": "",
        "more_like_this": {
          "enabled": false
        },
        "opening_statement": "",
        "suggested_questions": [],
        "sensitive_word_avoidance": {
          "enabled": false,
          "type": "",
          "configs": []
        },
        "speech_to_text": {
          "enabled": false
        },
        "text_to_speech": {
          "enabled": false
        },
        "file_upload": {
          "image": {
            "detail": "high",
            "enabled": false,
            "number_limits": 3,
            "transfer_methods": [
              "remote_url",
              "local_file"
            ]
          },
          "enabled": false,
          "allowed_file_types": [],
          "allowed_file_extensions": [
            ".JPG",
            ".JPEG",
            ".PNG",
            ".GIF",
            ".WEBP",
            ".SVG",
            ".MP4",
            ".MOV",
            ".MPEG",
            ".MPGA"
          ],
          "allowed_file_upload_methods": [
            "remote_url",
            "local_file"
          ],
          "number_limits": 3
        },
        "suggested_questions_after_answer": {
          "enabled": false
        },
        "retriever_resource": {
          "enabled": true
        },
        "agent_mode": {
          "enabled": false,
          "max_iteration": 5,
          "strategy": "react",
          "tools": []
        },
        "model": {
          "provider": "langgenius/ollama/ollama",
          "name": "huihui_ai/mistral-small-abliterated",
          "mode": "chat",
          "completion_params": {}
        },
        "dataset_configs": {
          "retrieval_model": "multiple",
          "top_k": 4,
          "reranking_mode": "reranking_model",
          "reranking_model": {
            "reranking_provider_name": "",
            "reranking_model_name": ""
          },
          "reranking_enable": false,
          "datasets": {
            "datasets": [
              {
                "dataset": {
                  "enabled": true,
                  "id": datasetId
                }
              }
            ]
          }
        }
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

  async createLibraryByArticle(doc: { name: string, content: string }) {
    const library = await this.createEmptyLibrary(doc.name);
    if (!library) {
      console.log("知识库创建失败");
      return
    }
    // return library
    const createDto = {
      name: doc.name,
      text: doc.content,
      indexing_technique: "economy",
      process_rule: {
        mode: "automatic"
      }
    }
    return await this.createDocumentByTextOnLibrary(
      library.id,
      createDto,
    );
  }

  // 创建dify知识库（空）
  async createEmptyLibrary(article_title: string) {
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

  async createDocumentByTextOnLibrary(datasetId: string, createDto) {
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

  async getCurrentBot(userId: string) {
    // 1. 查找用户的活跃阅读会话
    const activeSession = await this.prisma.readingSession.findUnique({
      where: {
        userId_status: {
          userId,
          status: 'IN_PROGRESS'
        }
      },
      include: {
        currentArticle: {
          include: {
            bot: true
          }
        }
      }
    });

    if (!activeSession || !activeSession.currentArticle) {
      return {
        success: false,
        error: 'No active reading session found'
      };
    }

    // 2. 获取当前进度信息
    const progress = await this.prisma.readingProgress.findUnique({
      where: {
        userId_articleId: {
          userId,
          articleId: activeSession.currentArticleId
        }
      }
    });

    return {
      success: true,
      data: {
        bot: {
          id: activeSession.currentArticle.bot.id,
          name: activeSession.currentArticle.bot.name,
          chatKey: activeSession.currentArticle.bot.chatKey,
        },
        article: {
          id: activeSession.currentArticle.id,
          title: activeSession.currentArticle.title,
        },
        session: {
          id: activeSession.id,
          currentRound: activeSession.currentRound,
          currentQuestionIndex: activeSession.currentQuestionIndex,
          currentQuestionType: activeSession.currentQuestionType,
        },
        progress: {
          conversationId: progress?.conversationId,
          progressPercent: progress?.progressPercent || 0,
        }
      }
    };
  }


}
