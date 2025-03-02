//导入coze
import {
  CozeAPI,
  ChatEventType,
  COZE_CN_BASE_URL,
  RoleType,
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
  private files: string[] = [];

  constructor(
    private readonly client: CozeAPI,
    private readonly botId: string
  ) { }

  public async sendMessage(
    userInput: string,
    updateCallback: (content: string) => void
  ) {
    let messages: any[] = [{
      type: 'text',
      text: userInput
    }]

    //在消息中携带所有已上传的文件id
    if (this.files.length > 0) {
      messages = messages.concat(this.files.map(fileId => ({
        type: 'file',
        file_id: fileId
      })));
      const content = JSON.stringify(messages || "");
      this.addMessage({
        role: RoleType.User,
        content: content,
        content_type: "object_string"
      });
    } else {
      // 添加用户消息到历史记录
      this.addMessage({
        role: RoleType.User,
        content: messages[0]?.text || "",
        content_type: "text"
      });
    }

    // 创建流式对话请求
    const request: any = {
      bot_id: this.botId,
      user_id: `user_${Date.now()}`,
      additional_messages: this.messages
    };

    // 发送请求
    console.log('本次带上的文件：',this.files);
    const stream = this.client.chat.stream(request);
    console.log(request);
    // const stream = (()=>{
    //   this.client
    // })();

    let botResponse = "";
    for await (const part of stream) {
      if (part.event === ChatEventType.CONVERSATION_MESSAGE_DELTA) {
        botResponse += part.data.content;
        updateCallback(part.data.content);
      }else if(part.event==ChatEventType.CONVERSATION_CHAT_FAILED){
        console.error('请求执行出错',request);
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

  public addFile(fileId: string) {
    this.files.push(fileId);
  }
}
// token配置
const token='pat_iiMmI2VszBGqUO5FzRdLX7WYOFjOOmZdY9MtdZDT5htaiNzAt60wvkPF5QnnuMTr';
// 使用个人访问令牌初始化客户端
const client = new CozeAPI({
  token: token, // 从 https://www.coze.cn/open/oauth/pats 获取你的 PAT
  // 或者
  // token: async () => {
  //   // 如果令牌过期则刷新
  //   return 'your_oauth_token';
  // },
  allowPersonalAccessTokenInBrowser: true,
  baseURL: COZE_CN_BASE_URL,
});

//创建会话实例
const BotId='7477199714741141554';
const chatSession = new ChatSession(client, BotId);

//对话框组件流式回复
export async function StreamChatWithBox(
  userInput: string,
  updateLogs: (log: string) => void
) {
  await chatSession.sendMessage(userInput, updateLogs);
}

// 添加清除历史记录功能
export function clearChatHistory() {
  chatSession.clearHistory();
}

export async function tryUploadFile(formData: FormData) {
  let id: string = "";
  await fetch('https://api.coze.cn/v1/files/upload',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData
    }
  ).then(response => response.json()).then(result => {
    id = result.data.id;
  });

  chatSession.addFile(id);
  return id || null;
}