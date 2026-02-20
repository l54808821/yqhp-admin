<script setup lang="ts">
/**
 * 完整的 AI 聊天视图组件
 * 使用 ant-design-x-vue BubbleList + Sender，集成 useAiChat
 */
import { ref, computed, watch, nextTick, onUnmounted } from 'vue';
import { BubbleList, Sender } from 'ant-design-x-vue';
import type { BubbleListProps } from 'ant-design-x-vue';
import { Button, Tag, Typography } from 'ant-design-vue';
import { createIconifyIcon } from '@vben/icons';
import { useAiChat } from './composables/useAiChat';
import AiBubbleContent from './AiBubbleContent.vue';
import type { AiChatConfig, AiChatMessage } from './types';

const StopIcon = createIconifyIcon('lucide:square');
const TrashIcon = createIconifyIcon('lucide:trash-2');
const SendIcon = createIconifyIcon('lucide:send');

const props = defineProps<{
  config: AiChatConfig;
  modelName?: string;
  modelDescription?: string;
  capabilityTags?: string[];
  welcomeIcon?: string;
}>();

const emit = defineEmits<{
  back: [];
}>();

const {
  messages,
  isStreaming,
  sendMessage,
  stopGeneration,
  clearMessages,
  regenerate,
} = useAiChat(props.config);

const inputText = ref('');
const listRef = ref<InstanceType<typeof BubbleList> | null>(null);

const roles: BubbleListProps['roles'] = {
  user: {
    placement: 'end',
    variant: 'filled',
    shape: 'round',
  },
  assistant: {
    placement: 'start',
    variant: 'shadow',
    shape: 'round',
    typing: false,
  },
};

const bubbleItems = computed(() =>
  messages.value.map((msg) => ({
    key: msg.id,
    role: msg.role,
    content: msg,
  })),
);

function handleSend(text: string) {
  if (!text.trim()) return;
  inputText.value = '';
  sendMessage(text);
}

function handleKeyPress(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    handleSend(inputText.value);
  }
}

function handleRegenerate(messageId: string) {
  regenerate(messageId);
}

// 自动滚动到底部
watch(
  () => messages.value.length,
  () => {
    nextTick(() => {
      const lastItem = bubbleItems.value[bubbleItems.value.length - 1];
      if (lastItem) {
        listRef.value?.scrollTo({ key: lastItem.key, block: 'end' });
      }
    });
  },
);

// 流式输出时持续滚动
watch(
  () => {
    const last = messages.value[messages.value.length - 1];
    return last?.content?.length ?? 0;
  },
  () => {
    if (!isStreaming.value) return;
    nextTick(() => {
      const lastItem = bubbleItems.value[bubbleItems.value.length - 1];
      if (lastItem) {
        listRef.value?.scrollTo({ key: lastItem.key, block: 'end' });
      }
    });
  },
);

onUnmounted(() => {
  stopGeneration();
});
</script>

<template>
  <div class="ai-chat-view">
    <!-- 消息列表 -->
    <div class="chat-body">
      <!-- 欢迎页 -->
      <div v-if="messages.length === 0" class="chat-welcome">
        <div class="welcome-icon">{{ welcomeIcon || '🤖' }}</div>
        <Typography.Title :level="4" style="margin-bottom: 8px">
          {{ modelName || 'AI 助手' }}
        </Typography.Title>
        <Typography.Text type="secondary">
          {{ modelDescription || '开始与 AI 模型对话吧' }}
        </Typography.Text>
        <div v-if="capabilityTags?.length" class="welcome-tags">
          <Tag v-for="tag in capabilityTags" :key="tag" color="blue">
            {{ tag }}
          </Tag>
        </div>
      </div>

      <!-- BubbleList -->
      <BubbleList
        v-else
        ref="listRef"
        :roles="roles"
        :items="bubbleItems"
        class="chat-bubble-list"
      >
        <template #message="{ item }">
          <!-- 用户消息：纯文本 -->
          <template v-if="item.role === 'user'">
            <div class="user-message">{{ (item.content as AiChatMessage).content }}</div>
          </template>
          <!-- AI 消息：复合内容 -->
          <template v-else>
            <AiBubbleContent
              :content="(item.content as AiChatMessage).content"
              :thinking="(item.content as AiChatMessage).thinking"
              :tool-calls="(item.content as AiChatMessage).toolCalls"
              :loading="(item.content as AiChatMessage).loading"
              :streaming="isStreaming && item.key === messages[messages.length - 1]?.id"
              :error="(item.content as AiChatMessage).error"
              show-actions
              :show-regenerate="!isStreaming"
              @regenerate="handleRegenerate((item.content as AiChatMessage).id)"
            />
          </template>
        </template>
      </BubbleList>
    </div>

    <!-- 底部操作栏 -->
    <div class="chat-footer">
      <!-- 停止生成 -->
      <div v-if="isStreaming" class="stop-bar">
        <Button size="small" danger @click="stopGeneration">
          <template #icon><StopIcon style="width: 12px; height: 12px" /></template>
          停止生成
        </Button>
      </div>

      <!-- 输入区域 -->
      <div class="chat-sender-wrapper">
        <Sender
          v-model:value="inputText"
          :loading="isStreaming"
          :disabled="isStreaming"
          placeholder="输入消息，Enter 发送，Shift+Enter 换行"
          @submit="handleSend"
          @keypress="handleKeyPress"
        />
        <div class="sender-extra">
          <Button
            type="text"
            size="small"
            :disabled="isStreaming || messages.length === 0"
            @click="clearMessages"
          >
            <template #icon><TrashIcon style="width: 14px; height: 14px" /></template>
            清空
          </Button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.ai-chat-view {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

.chat-body {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.chat-welcome {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  text-align: center;
}

.welcome-icon {
  margin-bottom: 16px;
  font-size: 48px;
}

.welcome-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  justify-content: center;
  margin-top: 16px;
}

.chat-bubble-list {
  height: 100%;
  padding: 16px 24px;
}

.chat-bubble-list :deep(.ant-bubble) {
  max-width: 75%;
}

.user-message {
  white-space: pre-wrap;
  word-break: break-word;
  line-height: 1.6;
}

.chat-footer {
  flex-shrink: 0;
  padding: 12px 24px 16px;
  background: var(--ant-color-bg-container, #fff);
  border-top: 1px solid var(--ant-color-border, #f0f0f0);
}

.stop-bar {
  display: flex;
  justify-content: center;
  margin-bottom: 8px;
}

.chat-sender-wrapper {
  max-width: 800px;
  margin: 0 auto;
}

.sender-extra {
  display: flex;
  justify-content: flex-end;
  margin-top: 4px;
}
</style>
