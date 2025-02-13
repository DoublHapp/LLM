export default defineAppConfig({
  pages: ["pages/testpage/index", "pages/index/index"],
  window: {
    backgroundTextStyle: "light",
    navigationBarBackgroundColor: "#fff",
    navigationBarTitleText: "WeChat",
    navigationBarTextStyle: "black",
  },
  //tabBar底部导航栏
  tabBar: {
    list: [
      {
        //iconPath: "",
        //selectedIconPath: "",
        pagePath: "/pages/index/index",
        text: "首页",
      },
      {
        //iconPath: "",
        //selectedIconPath: "",
        pagePath: "/pages/testpage/index",
        text: "测试页",
      },
    ],
  },
});
