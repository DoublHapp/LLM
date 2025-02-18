import { action, observable } from "mobx";
//导入连接coze服务函数
import { quickChat, streamChat } from "../services/connect_coze";

const testStore = observable({
  username: "林俊杰",
  logs: [],
  streamLogs: [],
  setUsername(name) {
    this.username = name;
  },
  setLogs: async function () {
    let res = await quickChat();
    console.log("store下的setLogs设置了logs");
    console.log(res);
    this.logs = res;
  },
  setStreamLogs: async function () {
    this.streamLogs = []; // 清空之前的流式日志
    await streamChat(
      action((log: string) => {
        this.streamLogs.push(log); // 逐步更新streamLogs
      })
    );

    console.log("store下的setStreamLogs设置了streamLogs");
  },
});

export default testStore;
