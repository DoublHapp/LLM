import { Component, PropsWithChildren } from "react";
import { View } from "@tarojs/components";
import { observer, inject } from "mobx-react";
import styles from "./index.module.scss";
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
  };
};

interface Index {
  props: PageStateProps;
}

@inject("store")
@observer
class Index extends Component<PropsWithChildren> {
  componentDidMount() {
  }

  componentWillUnmount() {}

  componentDidShow() {}

  componentDidHide() {}

  render() {

    return (
      <View className="index">
        <View className="content-area"></View>
        <View className={styles.container}>
          <View className={styles.logo}>
            AI助手
          </View>
          <ChatBox></ChatBox>
        </View>
      </View>
    );
  }
}

export default Index;
