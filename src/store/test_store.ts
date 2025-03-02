import { action, observable } from "mobx";
//导入连接coze服务函数

const testStore = observable({
  username: "林俊杰",
  logs: [],
  streamLogs: [],
  setUsername(name) {
    this.username = name;
  },
});

export default testStore;
