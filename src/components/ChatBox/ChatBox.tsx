import { useState, useEffect, useRef } from "react";
import Taro from "@tarojs/taro";
import { View, Input, Button, Text, Image, Textarea } from "@tarojs/components";
import {
  StreamChatWithBox,
  clearChatHistory,
} from "../../services/connect_coze";
import "./ChatBox.scss";

interface Message {
  type: "text" | "markdown" | "image" | "code"|"file";
  content: string;
  isUser: boolean;
  language?:string; // 添加语言属性
  fileName?: string;
  fileId?: string;
}

// 添加代码检测函数
const detectAndFormatCode = (content: string): { type: "text" | "code", content: string, language?: string } => {
  // 支持多个代码块的正则表达式
  const codeBlockRegex = /```([^\n]*)\n([\s\S]*?)```/g;
  const matches = content.match(codeBlockRegex);
  
  if (matches) {
    // 提取第一个代码块的语言和代码内容
    const languageMatch = content.match(/```([^\n]*)\n/);
    const language = languageMatch ? languageMatch[1].trim() : 'plaintext';
    
    // 提取代码内容
    const codeContent = content
      .replace(/```[^\n]*\n/, '') // 移除开头的 ```language
      .replace(/```$/, '')        // 移除结尾的 ```
      .trim();
    
    return {
      type: "code",
      content: codeContent,
      language: language
    };
  }
  
  return {
    type: "text",
    content
  };
};

const ChatBox: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [isInline, setIsInline] = useState(true);
  const [isInlineMode, setIsInlineMode] = useState(false);

  // 添加消息区域的引用
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 添加自动滚动函数
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // 在消息更新时自动滚动
  useEffect(() => {
    scrollToBottom();
  }, [messages]);


    // 处理文件上传
    const handleUpload = () => {
      if (process.env.TARO_ENV === 'h5') {
        // H5 环境使用 input type="file"
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '*/*'; // 接受所有文件类型
        input.style.display = 'none';
        
        input.onchange = async (e) => {
          const file = (e.target as HTMLInputElement).files?.[0];
          if (!file) return;
    
          // 检查文件大小
          if (file.size > 512 * 1024 * 1024) { // 512MB 限制
            alert('文件不能超过512MB');
            return;
          }
    
          // 添加加载中提示
          const loadingEl = document.createElement('div');
          loadingEl.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(0, 0, 0, 0.7);
            color: white;
            padding: 10px 20px;
            border-radius: 4px;
            z-index: 9999;
          `;
          loadingEl.textContent = '正在上传...';
          document.body.appendChild(loadingEl);
    
          try {
            // 创建 FormData
            const formData = new FormData();
            formData.append('file', file);
    
            // 使用 fetch 上传文件
            const response = await fetch('https://api.coze.cn/v1/files/upload', {
              method: 'POST',
              headers: {
                'Authorization': 'Bearer pat_tN6yrQoqhhdRPPpaTqAewZ4uNOUtJce8RNvkZhpG7RKJnnO5o0G5er4ucGpzTGhF'
              },
              body: formData
            });
    
            const result = await response.json();
    
            if (response.status === 200 && result.code === 0) {
              const fileId = result.data.id;
              const fileName = result.data.file_name;
    
              // 添加文件消息
              setMessages(prev => [...prev, {
                type: 'file',
                content: `上传文件：${fileName}`,
                isUser: true,
                fileName: fileName,
                fileId: fileId
              }]);
    
              // 创建机器人消息占位
              setMessages(prev => [...prev, {
                type: 'text',
                content: '',
                isUser: false
              }]);
    
              // 向 coze 发送带有文件信息的消息
              await StreamChatWithBox(
                `分析这个文件（file.id: ${fileId}），文件ID是：${fileName}`,
                (content: string, isNewLine: boolean) => {
                  setMessages(prev => {
                    const newMessages = [...prev];
                    const lastMessage = newMessages[newMessages.length - 1];
                    if (!lastMessage.isUser) {
                      lastMessage.content += content;
                    }
                    return newMessages;
                  });
                }
              );
    
              // 显示成功提示
              const successEl = document.createElement('div');
              successEl.style.cssText = `
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: rgba(0, 0, 0, 0.7);
                color: white;
                padding: 10px 20px;
                border-radius: 4px;
                z-index: 9999;
              `;
              successEl.textContent = '上传成功';
              document.body.appendChild(successEl);
              setTimeout(() => successEl.remove(), 2000);
            }
          } catch (error) {
            console.error('上传失败:', error);
            alert('上传失败');
          } finally {
            // 移除加载提示
            loadingEl.remove();
          }
        };
    
        document.body.appendChild(input);
        input.click();
        document.body.removeChild(input);
      } else {
        // 小程序环境使用 Taro API
        Taro.chooseMessageFile({
          count: 1,
          type: 'all',
          success: async (res) => {
            // ... 小程序上传逻辑
          }
        });
      }
    };

     // 渲染文件消息
  const renderFileMessage = (msg: Message) => {
    return (
      <View className="file-message">
        <View className="file-icon">📎</View>
        <Text className="file-name">{msg.fileName}</Text>
        <Text className="file-id">ID: {msg.fileId}</Text>
      </View>
    );
  };

  // 处理代码复制
  const handleCopyCode = (code: string) => {
    Taro.setClipboardData({
      data: code,
      success: () => {
        Taro.showToast({
          title: "代码已复制",
          icon: "success",
          duration: 2000
        });
      }
    });
  };

  // 处理发送消息
  const handleSend = async () => {
    if (!inputText.trim()) return;

    // 添加用户消息
    setMessages((prev) => [
      ...prev,
      {
        type: "text",
        content: inputText,
        isUser: true,
      },
    ]);

    // 创建机器人消息占位
    setMessages((prev) => [
      ...prev,
      {
        type: "text",
        content: "",
        isUser: false,
      },
    ]);

    //先清空输入框
    setInputText("");

    // 调用 StreamChatWithBox
    await StreamChatWithBox(inputText, (content: string, isNewLine: boolean) => {
      setMessages((prev) => {
        const newMessages = [...prev];
        const lastMessage = newMessages[newMessages.length - 1];
        if (!lastMessage.isUser) {
          // 累积内容
          const newContent = lastMessage.content + content;
          // 检查是否包含完整的代码块
          if (newContent.includes("```") && newContent.split("```").length % 2 === 1) {
            // 如果有完整的代码块
            const formattedContent = detectAndFormatCode(newContent);
            lastMessage.type = formattedContent.type;
            lastMessage.content = formattedContent.content;
            if (formattedContent.type === "code") {
              lastMessage.language = formattedContent.language;
            }
          } else {
            // 如果没有完整的代码块，保持文本格式
            lastMessage.content = newContent;
          }
        }
        return newMessages;
      });
    });
  };

  // 添加清除历史记录方法
  const handleClearHistory = () => {
    setMessages([]);
    clearChatHistory();
  };


// 渲染代码块
const renderCodeBlock = (content: string, language?: string) => (
  <View className="code-block">
    <View className="code-header">
      <Text className="language">{language || 'plaintext'}</Text>
      <Button 
        className="copy-btn"
        onClick={() => handleCopyCode(content)}
      >
        Copy
      </Button>
    </View>
    <View className="code-content">
      <Text className="code-text">{content}</Text>
    </View>
  </View>
);

  return (
    <View className={`chat-box ${isInlineMode ? "inline-mode" : ""}`}>
      <View className="messages-area">
        {messages.map((msg, index) => (
          <View
            key={index}
            className={`message ${msg.isUser ? "user" : "bot"}`}
          >
            {msg.type === "text" && <Text>{msg.content}</Text>}
            {msg.type === "code" && renderCodeBlock(msg.content,msg.language)}
            {msg.type === "file" && renderFileMessage(msg)}
          </View>
        ))}
        {/* 添加用于滚动的空div */}
        <View ref={messagesEndRef} className="messages-end" />
      </View>

      <View className="input-area">
        {/* <Input
          className="message-input"
          value={inputText}
          onInput={(e) => setInputText(e.detail.value)}
          onFocus={() => {
            if (isInline) setIsInlineMode(true);
          }}
          onConfirm={() => handleSend()}
          placeholder="请输入消息..."
        /> */}
        <Textarea
          className="message-input"
          value={inputText}
          onInput={(e) => setInputText(e.detail.value)}
          onFocus={() => {
            if (isInline) setIsInlineMode(true);
          }}
          onConfirm={() => handleSend()}
          placeholder="请输入消息..."
          maxlength={10000}
        />
        <View className="button-area">
          {/* 此处可以添加一个清除上下文联系历史记录的按钮 */}
          {!isInlineMode ? (
            <Button
              className={`inline-btn ${isInline ? "active" : ""}`}
              onClick={() => setIsInline(!isInline)}
            >
              内联
            </Button>
          ) : (
            <Button className="exit-btn" onClick={() => setIsInlineMode(false)}>
              退出
            </Button>
          )}
          <Button
            className="upload-btn"
            onClick={handleUpload}
            >
            上传
          </Button>
          <View
            className="placeholder"
          />
          <Button className="send-btn" onClick={handleSend}>
            发送
          </Button>
        </View>
      </View>
    </View>
  );
};

export default ChatBox;
