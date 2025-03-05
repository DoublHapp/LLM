# 前端LLM大项目

## 一、项目介绍

**项目核心信息概括**：一个兼容H5、微信小程序的LLM对话框组件  

**项目地址**：[GitHub 仓库](https://github.com/DoublHapp/LLM)

---

## 二、项目实现

### 2.1 技术选型与相关开发文档

1. 鉴于该组件需要与大模型进行连接与对话，我们选择了使用 `Coze API` 进行大模型对话。
2. 基于 Coze 的 API 以及智能体搭建，我们的对话框组件实现了以下主要功能：
   - 支持用户输入对话，且对话内容支持 **图片、Word、PDF** 等多媒体格式；
   - 用户输入对话并回车后，组件内 **流式展示** 大模型返回的结果；
   - 支持 **Markdown 解析** 和 **代码高亮**；
   - 支持流式返回结果，实现逐行打印效果；
   - 若返回结果包含代码，提供 **“Copy” 按钮**，方便用户复制代码；
   - 支持 **内联与独立对话** 两种功能模式。

### 2.2 架构设计

- 针对该组件需要兼容 H5 和小程序端的要求，我们选择了跨端开发框架 **Taro**。
- 在 **Taro 框架** 下，我们继续选择了 **Vite** 和 **React** 作为前端框架。
- 使用 **TypeScript** 编写代码。

#### 相关开发文档：
- [Taro 官方文档](https://docs.taro.zone/docs/)
- [Vite 官方文档](https://vitejs.cn/vite3-cn/guide/)
- [React 官方文档](https://zh-hans.react.dev/learn)
- [TypeScript 官方文档](https://www.tslang.cn/#google_vignette)

### 2.3 项目代码介绍

- **项目主目录结构**
  - `src/components`：实现了对话框组件
    - `ChatBox/`：实现了**独立对话框模式**
    - `ChatBoxInline/`：实现了**内联对话框模式**
  - `src/images/`：存放组件所需的图片
  - `src/pages/`：实现了 2 个主要页面，用于展示对话框组件的两种模式：
    - `index/`：展示**独立模式**
    - `chatBoxInline/`：展示**内联模式**
  - `src/services/connect_coze.ts`：用于处理与 `Coze` 的连接和交互逻辑
  - `src/app.config.ts`：注册了 2 个主要页面和 1 个 `tabBar` 底部导航栏

---

相关代码路径：
- [项目源码](https://github.com/DoublHapp/LLM/tree/b1/src)
- [对话框组件](https://github.com/DoublHapp/LLM/tree/b1/src/components)
- [ChatBox 组件](https://github.com/DoublHapp/LLM/tree/b1/src/components/ChatBox)
- [ChatBoxInline 组件](https://github.com/DoublHapp/LLM/tree/b1/src/components/ChatBoxInline)
- [与Coze的服务交互逻辑](https://github.com/DoublHapp/LLM/blob/b1/src/services/connect_coze.ts)

---


## 三、项目总结与反思

### 3.1 目前仍存在的问题

- 组件样式设计不够美观
- 小程序端 **不支持代码高亮**
- 图片 **不支持预览**

### 3.2 已识别出的优化项

- **代码高亮样式** 与整体样式不太适配
- 可以将 **联想功能** 实现独立样式，方便用户复制

### 3.3 架构演进的可能性

- **将与 Coze 的连接交互逻辑** 集成到对话框组件中
- **提供接口** 以应用对话框组件的 **2 种不同模式**

### 3.4 项目过程中的反思与总结

- 需要更加熟悉 **前端开发框架**
- 按照 **现实需求** 灵活地构建 **技术栈**
- **应用不同的方法** 解决 **兼容性问题**

---

## 四、其他补充资料

该项目创建参考[豆包青训营-前端项目一-LLM对话框组件 2.0](https://bytedance.larkoffice.com/docx/YP0Md2LwCoelRQxnwiZc5DWUndb)  
该项目[更详细的提交文档](https://xcn5dayu1clp.feishu.cn/wiki/Ud53wFieaifM34kqcW1c3RkbnJe?from=from_copylink)
