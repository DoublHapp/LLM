import { useState, useEffect, useRef } from "react";
import { View, Input, Button, Text, Image } from "@tarojs/components";
import { StreamChatWithBox } from "../../services/connect_coze";
import "./ChatBox.scss";

interface Message {
  type: "text" | "markdown" | "image" | "code";
  content: string;
  isUser: boolean;
}

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
    await StreamChatWithBox(
      inputText,
      (content: string, isNewLine: boolean) => {
        setMessages((prev) => {
          const newMessages = [...prev];
          const lastMessage = newMessages[newMessages.length - 1];
          if (!lastMessage.isUser) {
            // 将新内容追加到现有内容后面
            lastMessage.content += content;
          }
          return newMessages;
        });
      }
    );

  };

  return (
    <View className={`chat-box ${isInlineMode ? "inline-mode" : ""}`}>
      <View className="messages-area">
        {messages.map((msg, index) => (
          <View
            key={index}
            className={`message ${msg.isUser ? "user" : "bot"}`}
          >
            {msg.type === "text" && <Text>{msg.content}</Text>}
            {msg.type === "code" && (
              <View className="code-block">
                <Text>{msg.content}</Text>
                <Button
                  className="copy-btn"
                  onClick={() => {
                    /* 复制代码 */
                  }}
                >
                  Copy
                </Button>
              </View>
            )}
          </View>
        ))}
        {/* 添加用于滚动的空div */}
        <View ref={messagesEndRef} className="messages-end" />
      </View>

      <View className="input-area">
        <Input
          className="message-input"
          value={inputText}
          onInput={(e) => setInputText(e.detail.value)}
          onFocus={() => {
            if (isInline) setIsInlineMode(true);
          }}
          onConfirm={()=>handleSend()}
          placeholder="请输入消息..."
        />
        <Button className="send-btn" onClick={handleSend}>
          发送
        </Button>
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
      </View>
    </View>
  );
};

export default ChatBox;
