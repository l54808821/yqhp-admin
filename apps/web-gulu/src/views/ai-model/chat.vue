<script setup lang="ts">
import type { AiModel, ChatMessage } from '#/api/ai-model';

import { nextTick, onMounted, onUnmounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { useAppConfig } from '@vben/hooks';
import { useAccessStore } from '@vben/stores';

import {
  Button,
  message,
  Spin,
  Tag,
  Tooltip,
  Typography,
} from 'ant-design-vue';

import { getAiModelApi, parseSSEChunk } from '#/api/ai-model';

const route = useRoute();
const router = useRouter();
const accessStore = useAccessStore();
const { apiURL } = useAppConfig(import.meta.env, import.meta.env.PROD);

// 模型信息
const modelInfo = ref<AiModel | null>(null);
const modelLoading = ref(true);

// 对话状态
interface DisplayMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  loading?: boolean;
}

const messages = ref<DisplayMessage[]>([]);
const inputText = ref('');
const isStreaming = ref(false);
const messageContainerRef = ref<HTMLDivElement>();
let abortController: AbortController | null = null;

// 加载模型信息
async function loadModel() {
  const modelId = Number(route.params.modelId);
  if (!modelId) {
    message.error('无效的模型ID');
    return;
  }

  modelLoading.value = true;
  try {
    modelInfo.value = await getAiModelApi(modelId);
  } catch {
    message.error('加载模型信息失败');
  } finally {
    modelLoading.value = false;
  }
}

// 返回列表
function goBack() {
  const projectId = route.params.projectId;
  router.push(`/project/${projectId}/ai-model`);
}

// 滚动到底部
function scrollToBottom() {
  nextTick(() => {
    if (messageContainerRef.value) {
      messageContainerRef.value.scrollTop =
        messageContainerRef.value.scrollHeight;
    }
  });
}

// 生成消息ID
function generateId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

// 发送消息
async function handleSend() {
  const text = inputText.value.trim();
  if (!text || isStreaming.value || !modelInfo.value) return;

  // 添加用户消息
  const userMsg: DisplayMessage = {
    id: generateId(),
    role: 'user',
    content: text,
  };
  messages.value.push(userMsg);
  inputText.value = '';
  scrollToBottom();

  // 添加 AI 消息占位
  const aiMsg: DisplayMessage = {
    id: generateId(),
    role: 'assistant',
    content: '',
    loading: true,
  };
  messages.value.push(aiMsg);
  scrollToBottom();

  // 构建消息历史
  const chatMessages: ChatMessage[] = messages.value
    .filter((m) => !m.loading)
    .map((m) => ({
      role: m.role,
      content: m.content,
    }));

  isStreaming.value = true;
  abortController = new AbortController();

  try {
    const modelId = Number(route.params.modelId);
    const url = `${apiURL}/ai-models/${modelId}/chat`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Accept': 'text/event-stream',
        'Authorization': accessStore.accessToken
          ? `Bearer ${accessStore.accessToken}`
          : '',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ messages: chatMessages }),
      signal: abortController.signal,
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`请求失败 (${response.status}): ${errText}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error('无法获取响应流');

    const decoder = new TextDecoder();
    aiMsg.loading = false;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const content = parseSSEChunk(chunk);
      if (content) {
        aiMsg.content += content;
        scrollToBottom();
      }
    }

    if (!aiMsg.content) {
      aiMsg.content = '(模型未返回内容)';
    }
  } catch (error: any) {
    if (error.name === 'AbortError') {
      aiMsg.content += '\n\n[已停止]';
    } else {
      aiMsg.content = `请求失败: ${error.message}`;
      message.error('对话请求失败');
    }
    aiMsg.loading = false;
  } finally {
    isStreaming.value = false;
    abortController = null;
    scrollToBottom();
  }
}

// 停止生成
function handleStop() {
  if (abortController) {
    abortController.abort();
  }
}

// 清空对话
function handleClear() {
  messages.value = [];
}

// 按键处理
function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    handleSend();
  }
}

// 简单的文本格式化（处理代码块和基本格式）
function formatContent(content: string): string {
  // 转义 HTML
  let html = content
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // 代码块
  html = html.replace(
    /```(\w*)\n([\s\S]*?)```/g,
    '<pre class="code-block"><code>$2</code></pre>',
  );

  // 行内代码
  html = html.replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>');

  // 加粗
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

  // 换行
  html = html.replace(/\n/g, '<br />');

  return html;
}

onMounted(() => {
  loadModel();
});

onUnmounted(() => {
  if (abortController) {
    abortController.abort();
  }
});
</script>

<template>
  <div class="chat-page">
    <!-- 顶部栏 -->
    <div class="chat-header">
      <div class="chat-header__left">
        <Button type="text" @click="goBack">
          <template #icon>
            <span style="font-size: 18px">←</span>
          </template>
        </Button>
        <Spin v-if="modelLoading" size="small" />
        <template v-else-if="modelInfo">
          <Typography.Text strong style="font-size: 16px">
            {{ modelInfo.name }}
          </Typography.Text>
          <Tag v-if="modelInfo.version" color="blue">
            v{{ modelInfo.version }}
          </Tag>
          <Typography.Text type="secondary" style="margin-left: 4px">
            {{ modelInfo.provider }}
          </Typography.Text>
          <Tooltip :title="modelInfo.model_id">
            <Tag color="processing" style="margin-left: 8px">
              {{ modelInfo.model_id }}
            </Tag>
          </Tooltip>
        </template>
      </div>
      <div class="chat-header__right">
        <Button size="small" @click="handleClear" :disabled="isStreaming">
          清空对话
        </Button>
      </div>
    </div>

    <!-- 消息列表 -->
    <div ref="messageContainerRef" class="chat-messages">
      <!-- 欢迎消息 -->
      <div v-if="messages.length === 0 && !modelLoading" class="chat-welcome">
        <div class="chat-welcome__icon">🤖</div>
        <Typography.Title :level="4" style="margin-bottom: 8px">
          {{ modelInfo?.name || 'AI 助手' }}
        </Typography.Title>
        <Typography.Text type="secondary">
          {{ modelInfo?.description || '开始与 AI 模型对话吧' }}
        </Typography.Text>
        <div v-if="modelInfo?.capability_tags?.length" class="chat-welcome__tags">
          <Tag
            v-for="tag in modelInfo.capability_tags"
            :key="tag"
            color="blue"
          >
            {{ tag }}
          </Tag>
        </div>
      </div>

      <!-- 消息气泡 -->
      <div
        v-for="msg in messages"
        :key="msg.id"
        class="chat-message"
        :class="`chat-message--${msg.role}`"
      >
        <div class="chat-message__avatar">
          {{ msg.role === 'user' ? '👤' : '🤖' }}
        </div>
        <div class="chat-message__bubble">
          <Spin v-if="msg.loading && !msg.content" size="small" />
          <div
            v-else
            class="chat-message__content"
            v-html="formatContent(msg.content)"
          />
        </div>
      </div>
    </div>

    <!-- 输入区域 -->
    <div class="chat-input">
      <div class="chat-input__wrapper">
        <textarea
          v-model="inputText"
          class="chat-input__textarea"
          placeholder="输入消息，Enter 发送，Shift+Enter 换行"
          :disabled="isStreaming"
          rows="1"
          @keydown="handleKeydown"
          @input="(e: Event) => {
            const target = e.target as HTMLTextAreaElement;
            target.style.height = 'auto';
            target.style.height = Math.min(target.scrollHeight, 150) + 'px';
          }"
        />
        <div class="chat-input__actions">
          <Button
            v-if="isStreaming"
            type="default"
            danger
            @click="handleStop"
          >
            停止
          </Button>
          <Button
            v-else
            type="primary"
            :disabled="!inputText.trim() || !modelInfo"
            @click="handleSend"
          >
            发送
          </Button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.chat-page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: var(--ant-color-bg-layout, #f5f5f5);
}

.chat-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 20px;
  background: var(--ant-color-bg-container, #fff);
  border-bottom: 1px solid var(--ant-color-border, #f0f0f0);
}

.chat-header__left {
  display: flex;
  gap: 8px;
  align-items: center;
}

.chat-header__right {
  display: flex;
  gap: 8px;
  align-items: center;
}

.chat-messages {
  flex: 1;
  padding: 24px 20px;
  overflow-y: auto;
}

.chat-welcome {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 300px;
  text-align: center;
}

.chat-welcome__icon {
  margin-bottom: 16px;
  font-size: 48px;
}

.chat-welcome__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  justify-content: center;
  margin-top: 16px;
}

.chat-message {
  display: flex;
  gap: 12px;
  max-width: 800px;
  margin: 0 auto 20px;
}

.chat-message--user {
  flex-direction: row-reverse;
}

.chat-message__avatar {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  font-size: 18px;
  background: var(--ant-color-bg-container, #fff);
  border-radius: 50%;
  box-shadow: 0 1px 3px rgb(0 0 0 / 10%);
}

.chat-message__bubble {
  max-width: 75%;
  padding: 12px 16px;
  line-height: 1.6;
  border-radius: 12px;
}

.chat-message--user .chat-message__bubble {
  color: #fff;
  background: var(--ant-color-primary, #1677ff);
  border-bottom-right-radius: 4px;
}

.chat-message--assistant .chat-message__bubble {
  background: var(--ant-color-bg-container, #fff);
  border-bottom-left-radius: 4px;
  box-shadow: 0 1px 3px rgb(0 0 0 / 8%);
}

.chat-message__content {
  word-break: break-word;
}

.chat-message__content :deep(.code-block) {
  padding: 12px;
  margin: 8px 0;
  overflow-x: auto;
  font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
  font-size: 13px;
  line-height: 1.5;
  background: #1e1e1e;
  border-radius: 6px;
}

.chat-message--assistant .chat-message__content :deep(.code-block) {
  color: #d4d4d4;
}

.chat-message--user .chat-message__content :deep(.code-block) {
  color: #d4d4d4;
  background: rgb(0 0 0 / 20%);
}

.chat-message__content :deep(.inline-code) {
  padding: 2px 6px;
  font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
  font-size: 13px;
  background: rgb(0 0 0 / 8%);
  border-radius: 3px;
}

.chat-message--user .chat-message__content :deep(.inline-code) {
  background: rgb(255 255 255 / 20%);
}

.chat-input {
  padding: 16px 20px;
  background: var(--ant-color-bg-container, #fff);
  border-top: 1px solid var(--ant-color-border, #f0f0f0);
}

.chat-input__wrapper {
  display: flex;
  gap: 12px;
  align-items: flex-end;
  max-width: 800px;
  margin: 0 auto;
}

.chat-input__textarea {
  flex: 1;
  min-height: 40px;
  max-height: 150px;
  padding: 8px 12px;
  font-family: inherit;
  font-size: 14px;
  line-height: 1.5;
  resize: none;
  background: var(--ant-color-bg-layout, #f5f5f5);
  border: 1px solid var(--ant-color-border, #d9d9d9);
  border-radius: 8px;
  outline: none;
  transition: border-color 0.3s;
}

.chat-input__textarea:focus {
  border-color: var(--ant-color-primary, #1677ff);
  box-shadow: 0 0 0 2px rgb(22 119 255 / 10%);
}

.chat-input__textarea:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.chat-input__actions {
  flex-shrink: 0;
  padding-bottom: 2px;
}
</style>
