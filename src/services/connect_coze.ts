//导入coze
import {
  CozeAPI,
  ChatEventType,
  COZE_CN_BASE_URL,
  ChatStatus,
  RoleType,
} from "@coze/api";

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

//对话框组件流式回复
export async function StreamChatWithBox(
  userInput: string,
  updateLogs: (log: string, isNewLine: boolean) => void
) {
  const stream = await client.chat.stream({
    bot_id: "7470835601315987482",
    additional_messages: [
      {
        role: RoleType.User,
        content: userInput,
        content_type: "text",
      },
    ],
  });

  for await (const part of stream) {
    if (part.event === ChatEventType.CONVERSATION_MESSAGE_DELTA) {
      // 只传递新增的内容，而不是完整响应
      updateLogs(part.data.content, false);
    }
  }
}
