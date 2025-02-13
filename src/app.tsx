import { Component, PropsWithChildren } from "react";
import { Provider } from "mobx-react";

import counterStore from "./store/counter";
import testStore from "./store/test_store"; //测试store

import "./app.scss";

const store = {
  counterStore,
  testStore,
};

class App extends Component<PropsWithChildren> {
  componentDidMount() {}

  componentDidShow() {}

  componentDidHide() {}

  // this.props.children 就是要渲染的页面
  render() {
    return <Provider store={store}>{this.props.children}</Provider>;
  }
}

export default App;
