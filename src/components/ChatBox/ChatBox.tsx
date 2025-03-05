import { useState, useEffect, useRef } from "react";
import Taro from "@tarojs/taro";
import { View, Button, Text, Textarea, ScrollView } from "@tarojs/components";
import {
  StreamChatWithBox,
  tryUploadFile,
} from "../../services/connect_coze";
import "./ChatBox.scss";
import hljs from 'highlight.js'
import 'highlight.js/styles/github.css'

import { Marked } from "marked";




interface Message {
  type: "text" | "markdown" | "image" | "code" | "file" | "workflow";
  content: string;
  isUser: boolean;
  fileName?: string;
  fileId?: string;
  workflowResult?: string;
  end?: boolean;
  markedHtml?: string;//存储markdown转化后的字符串
}

// 节流函数用于控制渲染频率
function throttle<T extends (...args: any[]) => any>(fn: T, delay: number): (...args: Parameters<T>) => void {
  let lastCall = 0;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  return (...args: Parameters<T>) => {
    const now = Date.now();
    const timeSinceLastCall = now - lastCall;

    if (timeSinceLastCall >= delay) {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      fn(...args);
      lastCall = now;
    } else if (!timeoutId) {
      timeoutId = setTimeout(() => {
        fn(...args);
        timeoutId = null;
        lastCall = Date.now();
      }, delay - timeSinceLastCall);
    }
  };
}

const ChatBox: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const isConfirm = useRef(false);


  // 新增一个标记当前正在处理的消息索引的 ref
  const processingMsgIndexRef = useRef<number | null>(null);

  const codeRefs = useRef<{ [key: number]: HTMLPreElement | null }>({});
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
  useEffect(() => {
    Object.values(codeRefs.current).forEach(ref => {
      if (ref) {
        hljs.highlightElement(ref);
      }
    });
  }, [messages]);


  // 节流处理的 Markdown 转换函数
  const throttledMarkdownProcess = useRef(
    throttle(async (content: string, msgIndex: number) => {
      try {
        const html = await markdownToHtml(content);
        setMessages(messages => {
          const updatedMessages = [...messages];
          if (updatedMessages[msgIndex]) {
            updatedMessages[msgIndex].markedHtml = html;
            updatedMessages[msgIndex].type = 'markdown';
          }
          return updatedMessages;
        });
      } catch (error) {
        console.error('流式 Markdown 转换失败:', error);
      }
    }, 100) // 100ms 的节流延迟
  ).current;

  // 检查内容是否需要作为 Markdown 处理
  const shouldProcessAsMarkdown = (content: string): boolean => {
    return containsMarkdown(content);
  };




  useEffect(() => {
    try {
      //  注册普通文本plaintext的高亮
      hljs.registerLanguage('plaintext', () => ({
        name: 'plaintext',
        contains: []
      }));
      hljs.registerLanguage('plain', () => ({
        name: 'plaintext',
        contains: []
      }));
    } catch (e) {
      console.error('导入语言失败:', e);
    }
  }, []);

  // 添加此 useEffect 来处理 Markdown 中的代码块
  useEffect(() => {
    // 查找所有 Markdown 中的代码块
    const codeBlocks = document.querySelectorAll('.md-code-block');

    codeBlocks.forEach((block, index) => {
      try {
        // 获取代码和语言
        const codeElement = block as HTMLElement;
        const language = codeElement.dataset.language || 'plaintext';
        const codeData = codeElement.dataset.code;
        let code = '';

        try {
          if (codeData) {
            code = decodeURIComponent(codeData);
          }
        } catch (e) {
          console.error('解码代码内容失败:', e);
          code = codeData || '';
        }

        // 更新语言显示
        const languageElement = codeElement.querySelector('.language');
        if (languageElement) {
          languageElement.textContent = language;
        }

        // 查找复制按钮并添加事件处理
        const copyBtn = codeElement.querySelector('.copy-btn');
        if (copyBtn) {
          // 移除旧的事件监听器，避免重复添加
          const newCopyBtn = copyBtn.cloneNode(true);
          copyBtn.parentNode?.replaceChild(newCopyBtn, copyBtn);
          newCopyBtn.addEventListener('click', () => handleCopyCode(code));
        }

        // 查找 pre 元素并应用高亮
        const preElement = codeElement.querySelector('pre');
        if (preElement) {
          // 使用 textContent 确保代码是纯文本而不是 HTML
          if (!preElement.textContent && code) {
            preElement.textContent = code;
          }

          // 为代码块添加高亮类
          preElement.className = `language-${language}`;

          // 高亮代码
          try {
            hljs.highlightElement(preElement);
          } catch (e) {
            console.error('代码高亮失败:', e, language);
          }
        }
      } catch (error) {
        console.error('处理代码块出错:', error);
      }
    });
  }, [messages]);


  const markdownToHtml = async (content: string) => {
    console.log("开始解析Markdown");
    try {
      // 使用缓存的 Marked 实例，避免重复创建
      if (!markdownToHtml.markedInstance) {
        const marked = new Marked({
          breaks: true,
          gfm: true,
          pedantic: false,
          headerIds: true,
          mangle: false,
          silent: false
        });

        // // 设置选项，包括自定义渲染方法
        // marked.setOptions({
        //   breaks: true,
        //   gfm: true,
        //   pedantic: false,
        //   headerIds: true,
        //   mangle: false,
        //   silent: false
        // });

        // 自定义代码块渲染
        marked.use({
          renderer: {
            code(codeObj, languageStr) {
              // 在新版本的 marked 中，code 是一个对象而不是字符串
              let code: string;
              let language: string;

              if (typeof codeObj === 'object' && codeObj !== null) {
                // 处理代码对象
                code = codeObj.text || String(codeObj);

                // 从代码块信息中提取语言
                if (codeObj.lang) {
                  language = codeObj.lang;
                } else if (languageStr) {
                  language = languageStr;
                } else {
                  // 尝试从代码内容判断语言
                  if (code.includes('def ') && code.includes(':')) {
                    language = 'python';
                  } else if (code.includes('function') || code.includes('const ') || code.includes('let ') || code.includes('=>')) {
                    language = 'javascript';
                  } else if (code.includes('<html') || code.includes('</div>')) {
                    language = 'html';
                  } else if (code.includes('@media') || code.includes('{') && code.includes('}') && code.includes(':')) {
                    language = 'css';
                  } else if (code.includes('#include') || code.includes('int main')) {
                    language = 'c';
                  } else if (code.includes('import') && code.includes('from') && code.includes('class')) {
                    language = 'java';
                  } else {
                    language = 'plaintext';
                  }
                }

                // 特殊处理 Markdown 示例代码块
                if (code.includes('#') && code.includes('*') && code.includes('-') &&
                  code.includes('[') && code.includes(']') && code.includes('(') &&
                  code.includes(')') && language === 'markdown') {
                  language = 'markdown';
                }
              } else {
                // 回退处理：尽管不太可能发生，但处理 code 是字符串的情况
                code = String(codeObj);
                language = languageStr || 'plaintext';
              }

              // 处理可能的 HTML 实体编码
              const escapedCode = code
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#39;');

              const codeBlockId = `code-block-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

              return `<div class="md-code-block" id="${codeBlockId}" data-language="${language}" data-code="${encodeURIComponent(code)}">
                      <div class="md-code-header">
                        <span class="language">${language}</span>
                        <button class="copy-btn">Copy</button>
                      </div>
                      <div class="code-content">
                        <pre class="language-${language}">${escapedCode}</pre>
                      </div>
                    </div>`;
            }
          }
        });
        markdownToHtml.markedInstance = marked;
      }

      return await markdownToHtml.markedInstance.parse(content);
    } catch (error) {
      console.error('Markdown 解析失败:', error);
      return content; // 解析失败时返回原始内容
    }
  }
  // 添加静态属性来存储 Marked 实例
  markdownToHtml.markedInstance = null as Marked | null;

  // 判断内容是否为纯代码块
  const isOnlyCodeBlock = (content: string): boolean => {
    const trimmed = content.trim();
    return trimmed.startsWith("```") &&
      trimmed.endsWith("```") &&
      trimmed.split("```").length === 3;
  }

  // 判断内容是否包含非代码块的 Markdown 特性
  const containsMarkdown = (content: string): boolean => {
    // 检查常见的 Markdown 特性，但不只是代码块
    const markdownPatterns = [
      /^#+\s+.+$/m,          // 标题
      /\[.+\]\(.+\)/,        // 链接
      /!\[.+\]\(.+\)/,       // 图片
      /\*\*.*\*\*/,          // 加粗
      /\*.*\*/,              // 斜体
      /^>\s+.+$/m,           // 引用
      /^[-*+]\s+.+$/m,       // 无序列表
      /^[0-9]+\.\s+.+$/m,    // 有序列表
      /^---+$/m,             // 分隔线
      /\|\s*[-:]+\s*\|/,     // 表格
      /~~.*~~/,              // 删除线
    ];

    return markdownPatterns.some(pattern => pattern.test(content));
  }

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
          console.error('文件分析失败');
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

          // 判断内容类型
          if (!lastMessage.isUser) {
            if (isOnlyCodeBlock(lastMessage.content)) {
              // 纯代码块
              lastMessage.type = 'code';
            } else if (lastMessage.content.includes("```") || containsMarkdown(lastMessage.content)) {
              // 消息已经结束，确保最终的渲染是完整的
              markdownToHtml(lastMessage.content).then(html => {
                setMessages(messages => {
                  const updatedMessages = [...messages];
                  const msgToUpdate = updatedMessages.find(m => m === lastMessage);
                  if (msgToUpdate) {
                    msgToUpdate.markedHtml = html;
                    msgToUpdate.type = 'markdown';
                  }
                  return updatedMessages;
                });
              });
            } else {
              // 普通文本
              lastMessage.type = 'text';
            }
          }

          // 清除正在处理的消息索引
          processingMsgIndexRef.current = null;

          return newMessages;
        }

        if (!lastMessage.isUser) {
          // 累积内容
          lastMessage.content += content;

          // 获取消息在数组中的索引
          const msgIndex = newMessages.length - 1;

          // 检查是否应该作为 Markdown 处理
          if (shouldProcessAsMarkdown(lastMessage.content)) {
            // 先设置类型为 markdown，这样即使还在处理中也能显示为 markdown 视图
            lastMessage.type = 'markdown';

            // 记录正在处理的消息索引，并进行节流处理
            processingMsgIndexRef.current = msgIndex;
            throttledMarkdownProcess(lastMessage.content, msgIndex);
          }
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
            <pre ref={el => codeRefs.current[index] = el} className="code-text">
              <code className={`language-${block.language}`}>{block.content}</code>
            </pre>
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
          {msg.type === "markdown" && (
            <View
              className="markdown-content"
              dangerouslySetInnerHTML={{ __html: msg.markedHtml || `<p>${msg.content}</p>` }}
            />
          )}
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
    <View className={`chat-box`}>
      <ScrollView
        className="messages-area"
        scrollY
        scrollIntoView={`message-${messages.length - 1}`}
        ref={messagesAreaRef}
      >
        {messages.map(renderMessage)}
        {/* 添加用于滚动的空div */}
        <View ref={messagesEndRef} className="messages-end" id="messages=end" />
      </ScrollView>

      <View className="input-area">
        <Textarea
          className="message-input"
          value={inputText}
          onInput={(e) => {
            if (isConfirm.current) {
              isConfirm.current = false;
            } else {
              setInputText(e.detail.value);
            }
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
          <View
            className="placeholder"
          />
          <Button className="send-btn" onClick={() => handleSend()}>
            发送
          </Button>
        </View>
      </View>
    </View>
  );
};

export default ChatBox;
