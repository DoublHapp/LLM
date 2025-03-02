import { useState, useEffect, useRef } from "react";
import Taro from "@tarojs/taro";
import { View, Button, Text, Textarea } from "@tarojs/components";
import {
  StreamChatWithBox,
  tryUploadFile,
} from "../../services/connect_coze";
import "./ChatBox.scss";


interface Message {
  type: "text" | "markdown" | "image" | "code" | "file" | "workflow";
  content: string;
  isUser: boolean;
  language?: string; // 添加语言属性
  fileName?: string;
  fileId?: string;
  workflowResult?: string;
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
  const isConfirm = useRef(false);

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


  // 文件上传函数
  const handleFileRead = async () => {
    try {
      // 创建文件选择器
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '*/*';
      input.style.display = 'none';
      document.body.appendChild(input);

      input.onchange = async (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (!file) return;

        // 检查文件大小
        if (file.size > 512 * 1024 * 1024) {
          alert('文件不能超过512MB');
          return;
        }

        // 显示加载提示
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
        loadingEl.textContent = '正在分析文件...';
        document.body.appendChild(loadingEl);

        try {
          // 创建 FormData
          const formData = new FormData();
          formData.append('file', file);

          // 创建新的消息用于显示分析结果
          setMessages(prev => [...prev, {
            type: 'file',
            content: `上传文件：${file.name}`,
            isUser: true,
            fileName: file.name
          }]);

          setMessages(prev => [...prev, {
            type: 'text',
            content: '',
            isUser: false
          }]);

          const id= await tryUploadFile(formData);
          if(id) console.log('文件上传成功',id);
          else console.error('文件上传失败');
        } catch (error) {
          console.error('工作流执行失败:', error);
          alert('文件分析失败');
        } finally {
          loadingEl.remove();
        }
      };

      input.click();
      document.body.removeChild(input);
    } catch (error) {
      console.error('文件处理失败:', error);
      alert('文件处理失败');
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
            {msg.type === "code" && renderCodeBlock(msg.content, msg.language)}
            {msg.type === "file" && renderFileMessage(msg)}
          </View>
        ))}
        {/* 添加用于滚动的空div */}
        <View ref={messagesEndRef} className="messages-end" />
      </View>

      <View className="input-area">
        <Textarea
          className="message-input"
          value={inputText}
          onInput={(e) => {
            if(isConfirm.current){
              isConfirm.current=false;
            }else{
              setInputText(e.detail.value);
            }
          }}
          onFocus={() => {
            if (isInline) setIsInlineMode(true);
          }}
          onConfirm={() => {
            handleSend()
            isConfirm.current = true;
          }}
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
            onClick={handleFileRead}
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
