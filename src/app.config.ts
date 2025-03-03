export default defineAppConfig({
  pages: ["pages/index/index","pages/chatBoxInline/index"],
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
        pagePath: "pages/index/index",
        text: "内联对话框",
      },
      {
        //iconPath: "",
        //selectedIconPath: "",
        pagePath: "pages/chatBoxInline/index",
        text: "独立对话框",
      },
    ],
  },
});
