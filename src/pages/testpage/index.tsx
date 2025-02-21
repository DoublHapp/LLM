import { Component, PropsWithChildren } from "react";
import { View, Button, Text, Navigator } from "@tarojs/components";
import { observer, inject } from "mobx-react";
import Taro from "@tarojs/taro";
import "./index.scss";

import ChatBox from "../../components/ChatBox/ChatBox";

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

    const goFirstPage = () => {
      Taro.navigateTo({
        url: "/pages/index/index",
      });
    };

    return (
      <View className="index">
        <View className="content-area">
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
          <View>
            <ChatBox></ChatBox>
          </View>
        </View>
      </View>
    );
  }
}

export default Index;
