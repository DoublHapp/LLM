interface WxRequestOption {
  url: string; // 请求的 URL
  method?: string; // 请求方法，默认为 GET
  data?: any; // 请求的参数
  header?: { [key: string]: string }; // 请求头，默认为 {'content-type': 'application/json'}
  success?: (res: WxRequestSuccessResult) => void; // 请求成功的回调函数
  fail?: (err: WxRequestFailResult) => void; // 请求失败的回调函数
  complete?: (res: WxRequestCompleteResult) => void; // 请求完成的回调函数
  enableChunked?: boolean; // 是否启用分片传输，默认为 false
}

interface WxRequestSuccessResult {
  data: any; // 服务器返回的数据
  statusCode: number; // HTTP 状态码
  header: { [key: string]: string }; // 响应头
}

interface WxRequestFailResult {
  errMsg: string; // 错误信息
}

interface WxRequestCompleteResult {
  errMsg: string; // 请求完成信息
}

interface WxRequestTask {
  onChunkReceived(response)
}

declare namespace wx {
  function request(option: WxRequestOption): WxRequestTask;
}

//coze类型定义
type ContentType = 'text' | 'object_string' | 'card';
const COZE_CN_BASE_URL = "https://api.coze.cn";
enum RoleType {
  User = "user",
  Assistant = "assistant"
}
enum ChatEventType {
  CONVERSATION_CHAT_CREATED = "conversation.chat.created",
  CONVERSATION_CHAT_IN_PROGRESS = "conversation.chat.in_progress",
  CONVERSATION_CHAT_COMPLETED = "conversation.chat.completed",
  CONVERSATION_CHAT_FAILED = "conversation.chat.failed",
  CONVERSATION_CHAT_REQUIRES_ACTION = "conversation.chat.requires_action",
  CONVERSATION_MESSAGE_DELTA = "conversation.message.delta",
  CONVERSATION_MESSAGE_COMPLETED = "conversation.message.completed",
  CONVERSATION_AUDIO_DELTA = "conversation.audio.delta",
  DONE = "done",
  ERROR = "error"
}

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
  private speculattions: string[] = [];

  constructor(
    private readonly client: (request: any) => AsyncGenerator<any>,
    private readonly botId: string
  ) { }

  public async sendMessage(
    userInput: string,
    updateCallback: (content: string, end?: boolean) => void
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
    const request = {
      bot_id: this.botId,
      user_id: `user_${Date.now()}`,
      additional_messages: this.messages,
      stream: true,
    };

    // 发送请求
    const stream = this.client(request);

    let botResponse = "";
    let stopped = false, speculating = false;
    for await (const part of stream) {
      if (stopped) break;
      switch (part.event) {
        case ChatEventType.CONVERSATION_MESSAGE_DELTA:
          botResponse += part.data.content;
          updateCallback(part.data.content);
          break;
        case ChatEventType.CONVERSATION_CHAT_FAILED:
          console.error('请求执行出错', request);
          break;
        case ChatEventType.CONVERSATION_MESSAGE_COMPLETED:
          /**
           * 已知part.data.type如下：
           * text: 所有文本消息的总结
           * verbose: 疑似为消息发送结束的参数
           * follow_up: 消息结束后对下一个提问的猜测，可用于联想
           */
          if (part.data.type === 'follow_up') {
            //开始联想，清空之前的联想提问
            if (!speculating) {
              this.speculattions.length = 0;
              speculating = true;
              updateCallback('\n猜你想问：\n');
            }
            this.speculattions.push(part.data.content);
            //联想放哪没想好
            updateCallback(part.data.content + '\n');
          }
          break;
        case ChatEventType.DONE:
          updateCallback('', true);
          stopped = true;
          break;
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
export const token = 'pat_iiMmI2VszBGqUO5FzRdLX7WYOFjOOmZdY9MtdZDT5htaiNzAt60wvkPF5QnnuMTr';
// 使用个人访问令牌初始化客户端

const client = async function* (request: any) {
  if (process.env.TARO_ENV === 'h5') {
    const response = await fetch(`${COZE_CN_BASE_URL}/v3/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(request)
    })
    if (!response.ok || !response.body) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');

    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }

      const chunk = decoder.decode(value, { stream: true });

      const lines = chunk.split('\n\n');
      for (const line of lines) {
        if (line.length === 0) continue;
        try {
          const [rawEvent, rawData] = line.split('\n');
          const event = rawEvent.slice(6);
          const data = JSON.parse(rawData.slice(5));
          yield { event, data };
        } catch (e) {
          console.error('JSON解析失败:', e);
        }
      }
    }
  } else if (process.env.TARO_ENV === 'weapp') {
    const requestTask = wx.request({
      url: `${COZE_CN_BASE_URL}/v3/chat`,
      enableChunked: true,
      method: 'POST',
      header: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      data: JSON.stringify(request),
      success: function (res) {
        console.log('请求成功', res);
      },
      fail: function (err) {
        console.log('请求失败', err);
      }
    })
    while (true) {
      const chunk: string = await new Promise((resolve, reject) => {
        requestTask.onChunkReceived((response) => {
          const arrayBuffer = response.data;
          const decoder = new TextDecoder("utf-8");
          const chunk = decoder.decode(arrayBuffer);
          resolve(chunk);
        });
      })
      let done = false;
      const lines = chunk.split('\n\n');
      for (const line of lines) {
        if (line.length === 0) continue;
        try {
          const [rawEvent, rawData] = line.split('\n');
          const event = rawEvent.slice(6);
          const data = JSON.parse(rawData.slice(5));
          if (event === 'DONE') {
            done = true;
          }
          yield { event, data };
        } catch (e) {
          console.error('JSON解析失败:', e);
        }
      }
      if (done) break;
    }


  }
}

//创建会话实例
const BotId = '7477199714741141554';
const chatSession = new ChatSession(client, BotId);

//对话框组件流式回复
export async function StreamChatWithBox(
  userInput: string,
  updateLogs: (log: string, end?: boolean) => void
) {
  await chatSession.sendMessage(userInput, updateLogs);
}

// 添加清除历史记录功能
export function clearChatHistory() {
  chatSession.clearHistory();
}

export async function tryUploadFile(formData: FormData) {
  let id: string = "";
  if (process.env.TARO_ENV === 'h5') {
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
  } else if (process.env.TARO_ENV === 'weapp') {
    const file = formData;
    console.log(file);
    id = await new Promise((resolve) => {
      //@ts-ignore
      wx.uploadFile({
        url: 'https://api.coze.cn/v1/files/upload', // 你的接口地址
        //@ts-ignore
        filePath: file.path, // 文件路径
        name: 'file',
        header: {
          Authorization: `Bearer ${token}`
        },
        success: function (res) {
          // 上传成功，处理服务器返回的响应信息
          console.log('data0:\n', typeof res.data);
          const data=JSON.parse(res.data).data;
          const id = data.id;
          resolve(id);
        },
        fail: function (res) {
          // 上传失败，处理上传错误
          console.error(res);
        }
      });
    })
  }

  chatSession.addFile(id);
  return id || null;
}
