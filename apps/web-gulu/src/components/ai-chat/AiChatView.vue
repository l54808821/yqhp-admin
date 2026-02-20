<script setup lang="ts">
import { h, ref, computed, watch, nextTick, onUnmounted } from 'vue';
import { BubbleList, Sender } from 'ant-design-x-vue';
import type { BubbleListProps } from 'ant-design-x-vue';
import { Button, Tag, Typography } from 'ant-design-vue';
import { createIconifyIcon } from '@vben/icons';
import { useAiChat } from './composables/useAiChat';
import AiBubbleContent from './AiBubbleContent.vue';
import type { AiChatConfig, AiChatMessage } from './types';

const StopIcon = createIconifyIcon('lucide:square');
const TrashIcon = createIconifyIcon('lucide:trash-2');
const BotIcon = createIconifyIcon('lucide:bot');

function avatarSvg(svgPath: string, bg: string) {
  return h('div', {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: '36px',
      height: '36px',
      borderRadius: '50%',
      background: bg,
      flexShrink: '0',
    },
    innerHTML: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${svgPath}</svg>`,
  });
}

const userAvatarVNode = () => avatarSvg(
  '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
  '#1677ff',
);

const botAvatarVNode = () => avatarSvg(
  '<path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/>',
  'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
);

const props = defineProps<{
  config: AiChatConfig;
  modelName?: string;
  modelDescription?: string;
  capabilityTags?: string[];
  welcomeIcon?: string;
}>();

defineEmits<{
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
    avatar: userAvatarVNode(),
    styles: {
      content: {
        background: 'linear-gradient(135deg, #1677ff 0%, #4096ff 100%)',
        color: '#fff',
        borderRadius: '18px 18px 4px 18px',
        padding: '10px 16px',
        maxWidth: '520px',
        fontSize: '14px',
        lineHeight: '1.6',
        boxShadow: '0 2px 8px rgba(22, 119, 255, 0.15)',
      },
    },
  },
  assistant: {
    placement: 'start',
    variant: 'outlined',
    shape: 'round',
    typing: false,
    avatar: botAvatarVNode(),
    styles: {
      content: {
        background: '#ffffff',
        border: '1px solid #f0f0f0',
        borderRadius: '18px 18px 18px 4px',
        padding: '14px 18px',
        maxWidth: '680px',
        fontSize: '14px',
        lineHeight: '1.7',
        boxShadow: '0 1px 4px rgba(0, 0, 0, 0.04)',
      },
    },
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

function handleRegenerate(messageId: string) {
  regenerate(messageId);
}

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
        <div class="welcome-avatar">
          <BotIcon class="welcome-avatar-icon" />
        </div>
        <Typography.Title :level="4" class="welcome-title">
          {{ modelName || 'AI 助手' }}
        </Typography.Title>
        <Typography.Text type="secondary" class="welcome-desc">
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
        :style="{ height: '100%', maxWidth: '900px', margin: '0 auto', padding: '24px 16px' }"
      >
        <template #message="{ item }">
          <template v-if="item.role === 'user'">
            <div class="user-message">{{ (item.content as AiChatMessage).content }}</div>
          </template>
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

    <!-- 底部输入区 -->
    <div class="chat-footer">
      <div class="chat-footer-inner">
        <!-- 停止生成 -->
        <div v-if="isStreaming" class="stop-bar">
          <Button class="stop-btn" @click="stopGeneration">
            <template #icon><StopIcon class="stop-icon" /></template>
            停止生成
          </Button>
        </div>

        <!-- 输入框 -->
        <div class="sender-card">
          <Sender
            v-model:value="inputText"
            :loading="isStreaming"
            :disabled="isStreaming"
            placeholder="输入消息，Enter 发送，Shift+Enter 换行"
            @submit="handleSend"
          />
          <div class="sender-bottom">
            <span class="sender-hint">Enter 发送 / Shift+Enter 换行</span>
            <Button
              type="text"
              size="small"
              class="clear-btn"
              :disabled="isStreaming || messages.length === 0"
              @click="clearMessages"
            >
              <template #icon><TrashIcon class="clear-icon" /></template>
              清空对话
            </Button>
          </div>
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
  background: linear-gradient(180deg, #f7f8fa 0%, #eef1f5 100%);
}

/* 消息区域 */
.chat-body {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

/* 欢迎页 */
.chat-welcome {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 40px 24px;
  text-align: center;
}

.welcome-avatar {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 64px;
  height: 64px;
  margin-bottom: 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 20px;
  box-shadow: 0 8px 24px rgba(102, 126, 234, 0.3);
}

.welcome-avatar-icon {
  font-size: 32px;
  color: #fff;
}

.welcome-title {
  margin-bottom: 8px !important;
  color: #1a1a2e;
}

.welcome-desc {
  max-width: 400px;
  font-size: 14px;
}

.welcome-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  justify-content: center;
  margin-top: 20px;
}

/* BubbleList 的高度通过 inline style 控制，这里只做微调 */
.chat-bubble-list :deep(.ant-bubble) {
  margin-bottom: 8px;
}

.user-message {
  white-space: pre-wrap;
  word-break: break-word;
  line-height: 1.6;
}

/* 底部输入区 */
.chat-footer {
  flex-shrink: 0;
  padding: 0 16px 20px;
  background: transparent;
}

.chat-footer-inner {
  max-width: 800px;
  margin: 0 auto;
}

.stop-bar {
  display: flex;
  justify-content: center;
  margin-bottom: 12px;
}

.stop-btn {
  display: flex;
  gap: 6px;
  align-items: center;
  padding: 6px 20px;
  font-size: 13px;
  color: #ff4d4f;
  cursor: pointer;
  background: #fff;
  border: 1px solid #ffccc7;
  border-radius: 20px;
  box-shadow: 0 2px 8px rgba(255, 77, 79, 0.1);
  transition: all 0.2s;
}

.stop-btn:hover {
  background: #fff1f0;
  border-color: #ff4d4f;
  box-shadow: 0 4px 12px rgba(255, 77, 79, 0.15);
}

.stop-icon {
  width: 12px;
  height: 12px;
}

.sender-card {
  padding: 12px 16px;
  background: #fff;
  border: 1px solid #e8e8e8;
  border-radius: 16px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
  transition: box-shadow 0.3s, border-color 0.3s;
}

.sender-card:focus-within {
  border-color: #bfbfbf;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
}

.sender-card :deep(.ant-sender) {
  border: none !important;
  box-shadow: none !important;
  background: transparent !important;
}

.sender-card :deep(.ant-sender-content) {
  border: none !important;
}

.sender-card :deep(.ant-input),
.sender-card :deep(textarea) {
  border: none !important;
  box-shadow: none !important;
  background: transparent !important;
  padding: 0 !important;
  resize: none;
}

.sender-card :deep(.ant-input:focus),
.sender-card :deep(textarea:focus) {
  box-shadow: none !important;
}

.sender-bottom {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid #f5f5f5;
}

.sender-hint {
  font-size: 12px;
  color: #bfbfbf;
}

.clear-btn {
  font-size: 12px;
  color: #999;
}

.clear-btn:hover:not(:disabled) {
  color: #ff4d4f;
}

.clear-icon {
  width: 13px;
  height: 13px;
}
</style>
