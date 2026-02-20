import { ref, computed } from 'vue';
import type { AiChatMessage, AiChatConfig, StreamStatus, ImageAttachment, ContentPart } from '../types';
import { useAiStream } from './useAiStream';

function generateId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function buildMultimodalContent(text: string, images: ImageAttachment[]): string | ContentPart[] {
  if (!images.length) return text;
  const parts: ContentPart[] = [];
  for (const img of images) {
    if (img.dataUrl) {
      parts.push({ type: 'image_url', image_url: { url: img.dataUrl } });
    }
  }
  if (text.trim()) {
    parts.push({ type: 'text', text });
  }
  return parts;
}

export function useAiChat(config: AiChatConfig) {
  const messages = ref<AiChatMessage[]>([]);
  const stream = useAiStream();

  const isStreaming = computed(() =>
    stream.status.value === 'streaming' || stream.status.value === 'connecting',
  );

  const streamStatus = computed<StreamStatus>(() => stream.status.value);

  function addUserMessage(text: string, images?: ImageAttachment[]): AiChatMessage {
    const msg: AiChatMessage = {
      id: generateId(),
      role: 'user',
      content: text,
      images: images?.length ? images : undefined,
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

  function buildChatHistory(): Array<{ role: string; content: string | ContentPart[] }> {
    const history: Array<{ role: string; content: string | ContentPart[] }> = [];
    if (config.systemPrompt) {
      history.push({ role: 'system', content: config.systemPrompt });
    }
    for (const msg of messages.value) {
      if (msg.loading) continue;
      if (msg.images?.length) {
        history.push({
          role: msg.role,
          content: buildMultimodalContent(msg.content, msg.images),
        });
      } else {
        history.push({ role: msg.role, content: msg.content });
      }
    }
    return history;
  }

  async function prepareImages(images: ImageAttachment[]): Promise<ImageAttachment[]> {
    const prepared: ImageAttachment[] = [];
    for (const img of images) {
      if (img.dataUrl) {
        prepared.push(img);
      } else if (img.file) {
        const dataUrl = await fileToBase64(img.file);
        prepared.push({ ...img, dataUrl, status: 'done' });
      }
    }
    return prepared;
  }

  async function sendMessage(text: string, images?: ImageAttachment[]) {
    if ((!text.trim() && !images?.length) || isStreaming.value) return;

    let preparedImages: ImageAttachment[] | undefined;
    if (images?.length) {
      preparedImages = await prepareImages(images);
    }

    addUserMessage(text, preparedImages);
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
    let targetIdx = messages.value.length - 1;
    if (messageId) {
      targetIdx = messages.value.findIndex((m) => m.id === messageId);
      if (targetIdx < 0) return;
    }

    while (targetIdx >= 0 && messages.value[targetIdx]?.role !== 'assistant') {
      targetIdx--;
    }
    if (targetIdx < 0) return;

    messages.value.splice(targetIdx);

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
