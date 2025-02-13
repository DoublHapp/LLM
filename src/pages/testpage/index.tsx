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
      setUsername: Function;
      setLogs: Function;
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
    let logs = testStore.logs;
    testStore.setLogs();
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
        <View>coze回复:{testStore.logs}</View>
      </View>
    );
  }
}

export default Index;
