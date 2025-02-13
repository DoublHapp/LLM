import { observable } from "mobx";
//导入连接coze服务函数
import { quickChat } from "../services/connect_coze";

const testStore = observable({
  username: "林俊杰",
  logs: [],
  setUsername(name) {
    this.username = name;
  },
  setLogs: async function () {
    let res = await quickChat();
    console.log("store下的setLogs设置了logs");
    console.log(res);
    this.logs = res;
  },
});

export default testStore;
