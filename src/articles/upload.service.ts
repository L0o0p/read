import {  Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as mammoth from "mammoth";

@Injectable()
export class UploadService {
  constructor(private prisma: PrismaService) { }
  async processDocxUpload(file: Express.Multer.File) {
    // 转换docx为文本
    const result = await mammoth.extractRawText({ buffer: file.buffer });
    const text = result.value;

    // 分割文本内容
    const sections = this.splitContent(text);

    // 打印分割结果用于检查
    console.log('\n=== 解析结果 ===');
    console.log('\n【标题】:\n', sections.title);
    console.log('\n【文章内容】:\n', sections.article);
    console.log('\n【练习题】:');
    sections.exercises.forEach((q, i) => {
      console.log(`\n题目 ${i + 1}:`);
      console.log('内容:', q.content);
      console.log('选项:', q.options);
      console.log('答案:', q.answer);
      console.log('解析:', q.explanation);
    });
    console.log('\n【跟踪练习】:');
    sections.tracking.forEach((q, i) => {
      console.log(`\n题目 ${i + 1}:`);
      console.log('内容:', q.content);
      console.log('选项:', q.options);
      console.log('答案:', q.answer);
      console.log('解析:', q.explanation);
    });

    // 返回解析结果
    return {
      parsed: {
        title: sections.title,
        articlePreview: sections.article.substring(0, 100) + '...', // 只预览前100字符
        exerciseCount: sections.exercises.length,
        trackingCount: sections.tracking.length
      },
      sections  // 完整的解析结果
    };
  }

  private splitContent(text: string) {
    const sections = {
      title: '',
      article: '',
      exercises: [],
      tracking: []
    };

    const lines = text.split('\n').map(line => line.trim()).filter(line => line);

    sections.title = lines[1];
    let currentSection = 'article';
    let currentQuestion = null;

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];

      if (line === '练习题目') {
        currentSection = 'exercises';
        continue;
      } else if (line === '跟踪练习') {
        currentSection = 'tracking';
        continue;
      }

      if (currentSection === 'article') {
        sections.article += line + '\n';
      } else {
        if (line.match(/^\d+\./)) {
          if (currentQuestion) {
            (currentSection === 'exercises' ? sections.exercises : sections.tracking).push(currentQuestion);
          }
          currentQuestion = {
            orderNumber: parseInt(line.match(/^\d+/)[0]),
            content: line.replace(/^\d+\./, '').trim(),
            options: [],
            answer: '',
            explanation: ''
          };
        } else if (line.match(/^[A-D]\)/)) {
          currentQuestion.options.push({
            key: line.charAt(0),
            value: line.substring(2).trim()
          });
        } else if (line.startsWith('Correct Answer:')) {
          currentQuestion.answer = line.replace('Correct Answer:', '').trim();
        } else if (line.startsWith('Explanation:')) {
          currentQuestion.explanation = line.replace('Explanation:', '').trim();

          (currentSection === 'exercises' ? sections.exercises : sections.tracking).push(currentQuestion);
          currentQuestion = null;
        }
      }
    }

    return sections;
  }

  async convertArticleToHtml(file:any) {
    const article_title: string = file.originalname.split(".")[0]; // 获取文件名
    const buf = { buffer: Buffer.from(file.buffer) };

    console.log("article_title", article_title);
    // 将「阅读文章」转成html文本格式
    const htmlData = await mammoth.convertToHtml(buf);
    console.log("html", htmlData.value);
    const savableData = preprocessArticleContent(htmlData.value);
    console.log("savableData", savableData);
    return savableData
  }

}

function preprocessArticleContent(content: string): string {
  const dContent = removeReadArticleHeader(content);
  console.log("dContent", dContent);

  const startIndex = 0;
  const endIndex = dContent.indexOf("<h3>练习题目</h3>");

  if (endIndex === -1) {
    return ""; // 如果找不到关键标签,返回空字符串
  }

  return dContent.slice(startIndex, endIndex);
}

function removeReadArticleHeader(content: string): string {
  if (content.startsWith("<h3>阅读文章</h3>")) {
    return content.slice("<h3>阅读文章</h3>".length);
  }
  return content;
}