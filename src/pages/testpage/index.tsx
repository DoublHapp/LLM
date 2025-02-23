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

    return (
      <View className="index">
        <View className="content-area"></View>
        <View className="container">
          <ChatBox></ChatBox>
        </View>
      </View>
    );
  }
}

export default Index;
