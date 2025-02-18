import { Component, PropsWithChildren } from "react";
//导入Taro组件库
import { View, Button, Text, Navigator } from "@tarojs/components";
//mobx状态管理
import { observer, inject } from "mobx-react";

//导入Taro
import Taro from "@tarojs/taro";

//导入scss样式
import "./index.scss";

type PageStateProps = {
  children?;
  ReactNode;
  store: {
    counterStore: {
      counter: number;
      increment: Function;
      decrement: Function;
      incrementAsync: Function;
    };
    //新的测试状态存储
    testStore: {
      username: string;
      logs: string[];
      streamLogs: string[];
      setUsername: Function;
      setLogs: Function;
      setStreamLogs: Function;
    };
  };
};

interface Index {
  props: PageStateProps;
}

@inject("store")
@observer
class Index extends Component<PropsWithChildren> {
  componentDidMount() {
    let {
      store: { testStore },
    } = this.props;
    //testStore.setLogs();
    testStore.setStreamLogs();
  }

  componentWillUnmount() {}

  componentDidShow() {}

  componentDidHide() {}

  render() {
    let {
      store: { testStore },
    } = this.props;
    let username = testStore.username;
    const msg = "Hello Taro";

    //navigateto实现页面跳转
    const goFirstPage = () => {
      Taro.navigateTo({
        url: "/pages/index/index",
      });
    };

    return (
      <View className="index">
        <Text>username:{username}</Text>
        <Text>{msg}</Text>
        <Button
          onClick={() => {
            testStore.setUsername("王文博");
          }}
        >
          点击修改用户名
        </Button>
        <Button onClick={goFirstPage}>点击跳转首页方法1</Button>
        <Navigator url="/pages/index/index">点击跳转首页方法2</Navigator>
        <View className="square"></View>
        {/* <View>coze回复:{testStore.logs}</View> */}
        <View>coze流式回复:{testStore.streamLogs.join(" ")}</View>{" "}
        {/* 显示流式回答的结果 */}
      </View>
    );
  }
}

export default Index;
