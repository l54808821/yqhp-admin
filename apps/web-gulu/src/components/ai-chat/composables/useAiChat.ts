import { ref, computed } from 'vue';
import type { AiChatMessage, AiChatConfig, StreamStatus } from '../types';
import { useAiStream } from './useAiStream';

function generateId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function useAiChat(config: AiChatConfig) {
  const messages = ref<AiChatMessage[]>([]);
  const stream = useAiStream();

  const isStreaming = computed(() =>
    stream.status.value === 'streaming' || stream.status.value === 'connecting',
  );

  const streamStatus = computed<StreamStatus>(() => stream.status.value);

  function addUserMessage(text: string): AiChatMessage {
    const msg: AiChatMessage = {
      id: generateId(),
      role: 'user',
      content: text,
      timestamp: Date.now(),
    };
    messages.value.push(msg);
    return msg;
  }

  function addAssistantPlaceholder(): AiChatMessage {
    const msg: AiChatMessage = {
      id: generateId(),
      role: 'assistant',
      content: '',
      loading: true,
      timestamp: Date.now(),
    };
    messages.value.push(msg);
    return msg;
  }

  function getAssistantMessage(): AiChatMessage | undefined {
    return messages.value[messages.value.length - 1];
  }

  function buildChatHistory(): Array<{ role: string; content: string }> {
    const history: Array<{ role: string; content: string }> = [];
    if (config.systemPrompt) {
      history.push({ role: 'system', content: config.systemPrompt });
    }
    for (const msg of messages.value) {
      if (msg.loading) continue;
      history.push({ role: msg.role, content: msg.content });
    }
    return history;
  }

  async function sendMessage(text: string) {
    if (!text.trim() || isStreaming.value) return;

    addUserMessage(text);
    addAssistantPlaceholder();
    const aiMsg = getAssistantMessage()!;

    const chatMessages = buildChatHistory();
    const url = `${config.apiBaseUrl}/ai-models/${config.modelId}/chat`;

    await stream.startOpenAIStream({
      url,
      method: 'POST',
      headers: config.token
        ? { Authorization: `Bearer ${config.token}` }
        : {},
      body: {
        messages: chatMessages,
        ...(config.temperature != null ? { temperature: config.temperature } : {}),
        ...(config.maxTokens != null ? { max_tokens: config.maxTokens } : {}),
      },
      onChunk() {
        aiMsg.loading = false;
        aiMsg.content = stream.content.value;
        if (stream.thinking.value) {
          aiMsg.thinking = {
            content: stream.thinking.value,
            isComplete: false,
          };
        }
      },
      onComplete(finalContent) {
        aiMsg.loading = false;
        aiMsg.content = finalContent || '(模型未返回内容)';
        if (aiMsg.thinking) {
          aiMsg.thinking.isComplete = true;
        }
        if (stream.toolCalls.value.length > 0) {
          aiMsg.toolCalls = [...stream.toolCalls.value];
        }
      },
      onError(err) {
        aiMsg.loading = false;
        aiMsg.error = err.message;
        aiMsg.content = aiMsg.content || `请求失败: ${err.message}`;
      },
    });

    if (stream.status.value === 'aborted') {
      aiMsg.loading = false;
      aiMsg.content += '\n\n[已停止]';
    }
  }

  function stopGeneration() {
    stream.abort();
  }

  function clearMessages() {
    messages.value = [];
    stream.reset();
  }

  async function regenerate(messageId?: string) {
    // 找到要重新生成的消息，删除它及之后的所有消息
    let targetIdx = messages.value.length - 1;
    if (messageId) {
      targetIdx = messages.value.findIndex((m) => m.id === messageId);
      if (targetIdx < 0) return;
    }

    // 回溯到最近的 assistant 消息
    while (targetIdx >= 0 && messages.value[targetIdx]?.role !== 'assistant') {
      targetIdx--;
    }
    if (targetIdx < 0) return;

    // 获取该 assistant 消息前的最后一条 user 消息
    let userIdx = targetIdx - 1;
    while (userIdx >= 0 && messages.value[userIdx]?.role !== 'user') {
      userIdx--;
    }
    if (userIdx < 0) return;

    const userContent = messages.value[userIdx]!.content;

    // 删除 assistant 消息及之后的所有消息
    messages.value.splice(targetIdx);

    // 重新发送
    addAssistantPlaceholder();
    const aiMsg = getAssistantMessage()!;

    const chatMessages = buildChatHistory();
    const url = `${config.apiBaseUrl}/ai-models/${config.modelId}/chat`;

    await stream.startOpenAIStream({
      url,
      method: 'POST',
      headers: config.token
        ? { Authorization: `Bearer ${config.token}` }
        : {},
      body: { messages: chatMessages },
      onChunk() {
        aiMsg.loading = false;
        aiMsg.content = stream.content.value;
      },
      onComplete(finalContent) {
        aiMsg.loading = false;
        aiMsg.content = finalContent || '(模型未返回内容)';
      },
      onError(err) {
        aiMsg.loading = false;
        aiMsg.error = err.message;
        aiMsg.content = aiMsg.content || `请求失败: ${err.message}`;
      },
    });

    if (stream.status.value === 'aborted') {
      aiMsg.loading = false;
      aiMsg.content += '\n\n[已停止]';
    }
  }

  return {
    messages,
    isStreaming,
    streamStatus,
    sendMessage,
    stopGeneration,
    clearMessages,
    regenerate,
  };
}
