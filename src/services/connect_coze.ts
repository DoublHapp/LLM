//导入coze
import {
  CozeAPI,
  ChatEventType,
  COZE_CN_BASE_URL,
  RoleType,
  ChatStatus,
  ContentType,
} from "@coze/api";

interface Message {
  role: RoleType;
  content: string;
  content_type: ContentType;
}

//创建会话管理类
class ChatSession {
  private messages: Message[] = [];
  private readonly maxHistory: number = 20;

  constructor(
    private readonly client: CozeAPI,
    private readonly botId: string
  ) {}

  public async sendMessage(
    userInput: string,
    updateCallback: (content: string, isNewLine: boolean) => void
  ) {
    let messages: any[];
    try {
      // 解析用户输入为消息数组
      messages = JSON.parse(userInput);
      if (!Array.isArray(messages)) {
        messages = [{
          type: "text",
          text: userInput
        }];
      }
    } catch {
      // 如果解析失败，作为普通文本处理
      messages = [{
        type: "text",
        text: userInput
      }];
    }
  
    // 提取文本消息和文件信息
    const textMessage = messages.find(msg => msg.type === "text");
    const fileMessage = messages.find(msg => msg.type === "file");
  
    // 添加用户消息到历史记录
    this.addMessage({
      role: RoleType.User,
      content: textMessage?.text || "",
      content_type: "text"
    });
  
    // 创建流式对话请求
    const request: any = {
      bot_id: this.botId,
      user_id: `user_${Date.now()}`,
      additional_messages: this.messages
    };
  
    // 如果有文件信息，添加到请求中
    if (fileMessage?.file_id) {
      request.files = [{
        id: fileMessage.file_id
      }];
    }
  
    // 发送请求
    const stream = await this.client.chat.stream(request);
  
    let botResponse = "";
  
    for await (const part of stream) {
      if (part.event === ChatEventType.CONVERSATION_MESSAGE_DELTA) {
        botResponse += part.data.content;
        updateCallback(part.data.content, false);
      }
    }
  
    // 添加机器人回复到历史记录
    this.addMessage({
      role: RoleType.Assistant,
      content: botResponse,
      content_type: "text"
    });
  }

  private addMessage(message: Message) {
    this.messages.push(message);
    // 保持历史记录在限定长度内
    if (this.messages.length > this.maxHistory) {
      this.messages = this.messages.slice(-this.maxHistory);
    }
  }

  public clearHistory() {
    this.messages = [];
  }
}

// 使用个人访问令牌初始化客户端
const client = new CozeAPI({
  token: "pat_tN6yrQoqhhdRPPpaTqAewZ4uNOUtJce8RNvkZhpG7RKJnnO5o0G5er4ucGpzTGhF", // 从 https://www.coze.cn/open/oauth/pats 获取你的 PAT
  // 或者
  // token: async () => {
  //   // 如果令牌过期则刷新
  //   return 'your_oauth_token';
  // },
  allowPersonalAccessTokenInBrowser: true,
  baseURL: COZE_CN_BASE_URL,
});

//创建会话实例
const chatSession = new ChatSession(client, "7470835601315987482");

//对话框组件流式回复
export async function StreamChatWithBox(
  userInput: string,
  updateLogs: (log: string, isNewLine: boolean) => void
) {
  await chatSession.sendMessage(userInput, updateLogs);
}

// 添加清除历史记录功能
export function clearChatHistory() {
  chatSession.clearHistory();
}

//简单对话示例
export async function quickChat() {
  const v = await client.chat.createAndPoll({
    bot_id: "7470835601315987482",
    additional_messages: [
      {
        role: RoleType.User,
        content: "Hello!请介绍一下你自己",
        content_type: "text",
      },
    ],
  });

  let logs: string[] = [];

  if (v.chat.status === ChatStatus.COMPLETED) {
    if (v.messages) {
      for (const item of v.messages) {
        // console.log("[%s]:[%s]:%s", item.role, item.type, item.content);
        // logs.push(`[${item.role}]:[${item.type}]:${item.content}`);
        console.log("%s", item.content);
        logs.push(`${item.content}`);
      }
    }
    //console.log("usage", v.chat.usage);
    // logs.push("usage: " + v.chat.usage);
  }
  console.log("services下的connect_coze返回了logs");
  return logs;
}

export async function streamChat(updateLogs: (log: string) => void) {
  const stream = await client.chat.stream({
    bot_id: "7470835601315987482",
    additional_messages: [
      {
        role: RoleType.User,
        content: "Hello!请介绍一下你的同伴摩尔加纳。",
        content_type: "text",
      },
    ],
  });

  for await (const part of stream) {
    if (part.event === ChatEventType.CONVERSATION_MESSAGE_DELTA) {
      //process.stdout.write(part.data.content); // 实时响应
      console.log(part.data.content); // 实时响应
      updateLogs(part.data.content); // 逐步更新logs数组
    }
  }

  console.log("services下的connect_coze成功流式返回了streamlogs");
}
