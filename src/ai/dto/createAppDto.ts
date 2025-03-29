export class createAppDto {
    app: { name: string };
    doc: {
        name: string,
        content: string
    }
}

// 定义返回类型接口
export interface ConversationResult {
  success: boolean;
  message: string;
  conversationId?: string | null;
}
