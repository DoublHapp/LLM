//导入coze
import { CozeAPI, COZE_CN_BASE_URL, ChatStatus, RoleType } from "@coze/api";

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

// 简单对话示例
export async function quickChat() {
  const v = await client.chat.createAndPoll({
    bot_id: "7470457444561911818",
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
    for (const item of v.messages) {
      console.log("[%s]:[%s]:%s", item.role, item.type, item.content);
      logs.push(`[${item.role}]:[${item.type}]:${item.content}`);
    }
    console.log("usage", v.chat.usage);
    logs.push("usage: " + v.chat.usage);
  }
  console.log("services下的connect_coze返回了logs");
  return logs;
}
