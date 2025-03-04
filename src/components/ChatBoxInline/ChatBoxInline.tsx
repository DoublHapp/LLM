import { useState, useEffect, useRef } from "react";
import Taro from "@tarojs/taro";
import { View, Button, Text, Textarea, Input, ScrollView } from "@tarojs/components";
import {
  StreamChatWithBox,
  tryUploadFile,
} from "../../services/connect_coze";
import "./ChatBoxInline.scss";


interface Message {
  type: "text" | "markdown" | "image" | "code" | "file" | "workflow";
  content: string;
  isUser: boolean;
  fileName?: string;
  fileId?: string;
  workflowResult?: string;
  end?: boolean;
}

const ChatBoxInline: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [isInline, setIsInline] = useState(true);
  const isConfirm = useRef(false);

  // 添加消息区域的引用
  const messagesAreaRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 添加自动滚动函数
  const scrollToBottom = () => {
    if (process.env.TARO_ENV === 'h5') {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
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
          console.error('文件不能超过512MB');
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

          const id = await tryUploadFile(formData);
          if (id) {
            console.log('文件上传成功', id);
            setMessages(prev => {
              const newMessages = [...prev];
              const lastMessage = newMessages[newMessages.length - 1];
              lastMessage.end = true;
              lastMessage.content = `文件上传成功，ID: ${id}`;
              return newMessages;
            });
          }
          else console.error('文件上传失败');
        } catch (error) {
          console.error('工作流执行失败:', error);
        } finally {
          loadingEl.remove();
        }
      };

      input.click();
      document.body.removeChild(input);
    } catch (error) {
      console.error('文件处理失败:', error);
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
    if (Taro.setClipboardData) {
      Taro.setClipboardData({
        data: code,
        success: function (res) {
          Taro.getClipboardData({
            success: function (res) {
              console.log(res.data) // data
            }
          })
        }
      });
    } else {
      navigator.clipboard.writeText(code).then(() => {
        console.log('复制成功');
      }).catch((err) => {
        console.error('复制失败', err);
      });
    }
  };

  // 处理发送消息
  const handleSend = async (content?: string) => {
    if (!content) content = inputText;
    if (!content.trim()) return;
    if (messages.length !== 0 && messages[messages.length - 1]?.end !== true) {
      console.error('请等待上一条消息处理完成');
      return;
    }
    // 添加用户消息
    setMessages((prev) => [
      ...prev,
      {
        type: "text",
        content: content,
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
    await StreamChatWithBox(content, (content: string, end: boolean = false) => {
      setMessages((prev) => {
        const newMessages = [...prev];
        const lastMessage = newMessages[newMessages.length - 1];
        //若已停止，则不更新消息
        if (lastMessage.end) return newMessages;
        if (end) {
          lastMessage.end = end;
          return newMessages;
        }
        if (!lastMessage.isUser) {
          // 累积内容
          const newContent = lastMessage.content + content;
          // 检查是否包含完整的代码块
          if (newContent.includes("```") && newContent.split("```").length % 2 === 1) {
            // 如果有完整的代码块
            lastMessage.type = 'code';
          }
          lastMessage.content = newContent;
        }
        return newMessages;
      });
    });
  };

  // 渲染代码块
  const renderCodeBlock = (content: string) => {
    const blocks = [...(content.matchAll(/```([^\n]*)\n[\s\S]*?```/g))];
    const result: Array<{ content: string, type: 'text' | 'code', language?: string }> = [];
    let lastIndex = 0;

    for (const match of blocks) {
      const matchText = match[0];
      const matchIndex = match.index;

      // 添加匹配前的子字符串
      if (matchIndex > lastIndex) {
        result.push({
          content: content.slice(lastIndex, matchIndex),
          type: 'text'
        });
      }

      // 添加匹配结果
      result.push({
        //移除开头和结尾的 ``` 符号
        content: matchText.replace(/```[^\n]*\n/, '').replace(/```$/, '').trim(),
        type: 'code',
        language: match[1]
      });

      // 更新索引
      lastIndex = matchIndex + matchText.length;
    }

    // 添加最后一段子字符串
    if (lastIndex < content.length) {
      result.push({
        content: content.slice(lastIndex),
        type: 'text'
      });
    }
    return result.map((block, index) => {
      if (block.type === 'text') {
        return <Text
          key={index}
          userSelect>
          {block.content}
        </Text>
      } else if (block.type === 'code') {
        return <View
          key={index}
          className="code-block"
        >
          <View className="code-header">
            <Text className="language">{block.language || 'plaintext'}</Text>
            <Button
              className="copy-btn"
              onClick={() => handleCopyCode(block.content)}
            >
              Copy
            </Button>
          </View>
          <View className="code-content">
            <Text className="code-text" userSelect>{block.content}</Text>
          </View>
        </View>
      } else {
        throw (new Error('未知的代码块类型'));
      }
    });
  }

  //渲染一段消息
  const renderMessage = (msg: Message, index: number) => {
    return (
      <View
        key={index}
        id={`message-${index}`}
        className={`message ${msg.isUser ? "user" : "bot"}`}
      >
        <View className={`message-headImage ${msg.isUser
          ? "user"
          : "bot"
          }`}>
        </View>

        <View className="message-content">
          {msg.type === "text" && <Text userSelect>{msg.content}</Text>}
          {msg.type === "code" && renderCodeBlock(msg.content)}
          {msg.type === "file" && renderFileMessage(msg)}
        </View>

        <View className="message-btns">
          {/* 加载中的提示 */}
          {!msg.end && !msg.isUser && <View
            className="loading"
            onClick={() => {
              setMessages((prev) => {
                const newMessages = [...prev];
                const lastMessage = newMessages[newMessages.length - 1];
                lastMessage.end = true;
                return newMessages;
              });
            }}
          ></View>}

          {/* 重发按钮 */}
          {msg.isUser && <View
            className="rebuild"
            onClick={() => {
              handleSend(msg.content);
            }}
          ></View>}

          {/* 删除消息按钮 */}
          {(msg.end || msg.isUser) && <View
            className="delete"
            onClick={() => {
              setMessages((prev) => {
                const newMessages = [...prev];
                newMessages.splice(index, 1);
                return newMessages;
              });
            }}></View>}
        </View>
      </View>
    )
  }

  return (
    <View
      className={`chat-box-inline ${isInline ? "inline-mode" : ""}`}
    >
      <ScrollView
        className="messages-area"
        scrollY
        scrollIntoView={`message-${messages.length-1}`}
        ref={messagesAreaRef}
      >
        {messages.map(renderMessage)}
        {/* 添加用于滚动的空div */}
        <View ref={messagesEndRef} className="messages-end" id="messages=end" />
      </ScrollView>

      <View className="input-area">
        <Input
          className="message-input"
          value={inputText}
          onInput={(e) => {
            if (isConfirm.current) {
              isConfirm.current = false;
            } else {
              setInputText(e.detail.value);
            }
          }}
          onFocus={() => {
            setIsInline(false);
          }}
          onConfirm={() => {
            handleSend()
            isConfirm.current = true;
          }}
          placeholder="请输入消息..."
          maxlength={10000}
        />
        <View className="button-area">
          <Button
            className="upload-btn"
            onClick={handleFileRead}
          >
            上传
          </Button>
          <Button className="send-btn" onClick={() => handleSend()}>
            发送
          </Button>
        </View>
      </View>
    </View>
  );
};

export default ChatBoxInline;
