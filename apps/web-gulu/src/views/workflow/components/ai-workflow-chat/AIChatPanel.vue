<script setup lang="ts">
import { ref, computed, onMounted, watch, nextTick, onUnmounted } from 'vue';

import { Button, Dropdown, Typography, Tooltip, Popconfirm } from 'ant-design-vue';
import { createIconifyIcon } from '@vben/icons';

import type { Workflow } from '#/api/workflow';
import AiBubbleContent from '#/components/ai-chat/AiBubbleContent.vue';
import ChatSender from '#/components/ai-chat/ChatSender.vue';
import type { ChatSenderAttachment } from '#/components/ai-chat/ChatSender.vue';
import { ContentBlockRenderer } from '../shared/blocks';
import AIInteractionCard from './AIInteractionCard.vue';
import { useAIWorkflowChat } from './useAIWorkflowChat';

const PlusIcon = createIconifyIcon('lucide:plus');
const TrashIcon = createIconifyIcon('lucide:trash-2');
const StopIcon = createIconifyIcon('lucide:square');
const ArrowDownIcon = createIconifyIcon('lucide:arrow-down');
const MessageCircle = createIconifyIcon('lucide:message-circle');
const SparklesIcon = createIconifyIcon('lucide:sparkles');
const PanelLeftClose = createIconifyIcon('lucide:panel-left-close');
const PanelLeftOpen = createIconifyIcon('lucide:panel-left-open');
const ArrowBigUpIcon = createIconifyIcon('lucide:arrow-big-up');
const ArrowBigDownIcon = createIconifyIcon('lucide:arrow-big-down');
const RefreshCwIcon = createIconifyIcon('lucide:refresh-cw');

interface Props {
  workflow: Workflow;
  definition?: Record<string, any>;
  envId?: number;
  compact?: boolean;
  persistConversation?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  definition: undefined,
  envId: 0,
  compact: false,
  persistConversation: true,
});

const chat = useAIWorkflowChat({
  workflow: props.workflow,
  getDefinition: () => props.definition,
  envId: props.envId,
  persistConversation: props.persistConversation,
});

const chatBodyRef = ref<HTMLElement | null>(null);
const isAtBottom = ref(true);
const sidebarCollapsed = ref(false);

const hasMessages = computed(() => chat.messages.value.length > 0);

onMounted(() => {
  chat.loadConversations();
});

watch(
  () => props.workflow,
  () => {
    chat.loadConversations();
    chat.startNewConversation();
  },
);

watch(
  () => chat.messages.value.length,
  () => {
    if (isAtBottom.value) {
      nextTick(scrollToBottom);
    }
  },
);

// 监听最新消息内容/blocks变化（流式更新时滚动）
watch(
  () => {
    const msgs = chat.messages.value;
    const last = msgs[msgs.length - 1];
    return (last?.blocks?.length || 0) + (last?.content?.length || 0);
  },
  () => {
    if (isAtBottom.value) {
      nextTick(scrollToBottom);
    }
  },
);

function handleScroll(e: Event) {
  const el = e.target as HTMLElement;
  isAtBottom.value = el.scrollHeight - el.scrollTop - el.clientHeight <= 40;
}

function scrollToBottom() {
  if (chatBodyRef.value) {
    chatBodyRef.value.scrollTo({ top: chatBodyRef.value.scrollHeight, behavior: 'smooth' });
    isAtBottom.value = true;
  }
}

function handleSend(text: string, attachments: ChatSenderAttachment[]) {
  const doneAttachments = attachments.filter((a) => a.status === 'done' && a.url);
  chat.sendMessage(text, doneAttachments.length > 0 ? doneAttachments : undefined);
}

function handleUploadFiles(files: File[], callback: (results: ChatSenderAttachment[]) => void) {
  chat.uploadFiles(files).then(callback);
}

function handleSuggestedQuestion(q: string) {
  chat.sendMessage(q);
}

function handleInteractionConfirm(value: string) {
  chat.interactionValue.value = value;
  chat.confirmInteraction();
}

onUnmounted(() => {
  chat.stopGeneration();
});
</script>

<template>
  <div class="ai-chat-panel" :class="{ 'ai-chat-panel--compact': compact }">
    <!-- 左侧会话列表 -->
    <div v-if="!compact" class="sidebar" :class="{ 'sidebar--collapsed': sidebarCollapsed }">
      <div class="sidebar-header">
        <div class="sidebar-title">
          <SparklesIcon class="sidebar-title-icon" />
          <span>{{ workflow.name || '对话' }}</span>
        </div>
        <Tooltip title="收起侧栏">
          <button class="sidebar-toggle" @click="sidebarCollapsed = true">
            <PanelLeftClose class="size-4" />
          </button>
        </Tooltip>
      </div>

      <Button
        type="primary"
        block
        class="new-conv-btn"
        @click="chat.startNewConversation()"
      >
        <template #icon><PlusIcon class="size-4" /></template>
        开启新对话
      </Button>

      <div class="conv-list">
        <div
          v-for="conv in chat.conversations.value"
          :key="conv.id"
          class="conv-item"
          :class="{ 'conv-item--active': chat.currentConversation.value?.id === conv.id }"
          @click="chat.switchConversation(conv)"
        >
          <MessageCircle class="conv-item-icon" />
          <span class="conv-item-title">{{ conv.title || '新的对话' }}</span>
          <Popconfirm title="确定删除此对话？" @confirm.stop="chat.deleteConversation(conv.id)">
            <button class="conv-item-delete" @click.stop>
              <TrashIcon class="size-3" />
            </button>
          </Popconfirm>
        </div>
        <div v-if="chat.conversations.value.length === 0" class="conv-empty">
          暂无对话
        </div>
      </div>
    </div>

    <!-- 右侧对话区域 -->
    <div class="chat-main">
      <!-- 侧栏收起时的展开按钮 -->
      <div v-if="!compact && sidebarCollapsed" class="sidebar-expand-bar">
        <Tooltip title="展开侧栏" placement="right">
          <button class="sidebar-expand-btn" @click="sidebarCollapsed = false">
            <PanelLeftOpen class="size-4" />
          </button>
        </Tooltip>
      </div>

      <!-- compact 模式下的顶部会话栏 -->
      <div v-if="compact" class="compact-topbar">
        <div class="compact-topbar-left">
          <SparklesIcon class="compact-topbar-icon" />
          <span class="compact-topbar-title">
            {{ chat.currentConversation.value?.title || workflow.name || 'AI 对话' }}
          </span>
        </div>
        <div class="compact-topbar-right">
          <Tooltip title="历史对话">
            <Dropdown placement="bottomRight" :trigger="['click']">
              <button class="compact-topbar-btn">
                <MessageCircle class="size-4" />
              </button>
              <template #overlay>
                <div class="conv-dropdown">
                  <div class="conv-dropdown-header">
                    <span>历史对话</span>
                    <Button type="link" size="small" @click="chat.startNewConversation()">
                      <template #icon><PlusIcon class="size-3" /></template>
                      新对话
                    </Button>
                  </div>
                  <div class="conv-dropdown-list">
                    <div
                      v-for="conv in chat.conversations.value"
                      :key="conv.id"
                      class="conv-dropdown-item"
                      :class="{ 'conv-dropdown-item--active': chat.currentConversation.value?.id === conv.id }"
                      @click="chat.switchConversation(conv)"
                    >
                      <span class="conv-dropdown-item-title">{{ conv.title || '新的对话' }}</span>
                      <Popconfirm title="确定删除？" @confirm.stop="chat.deleteConversation(conv.id)">
                        <button class="conv-dropdown-item-delete" @click.stop>
                          <TrashIcon class="size-3" />
                        </button>
                      </Popconfirm>
                    </div>
                    <div v-if="chat.conversations.value.length === 0" class="conv-dropdown-empty">
                      暂无历史对话
                    </div>
                  </div>
                </div>
              </template>
            </Dropdown>
          </Tooltip>
          <Tooltip title="开启新对话">
            <button class="compact-topbar-btn" @click="chat.startNewConversation()">
              <PlusIcon class="size-4" />
            </button>
          </Tooltip>
        </div>
      </div>

      <!-- 对话内容 -->
      <div ref="chatBodyRef" class="chat-body" @scroll="handleScroll">
        <!-- 欢迎页 -->
        <div v-if="!hasMessages" class="chat-welcome">
          <div class="welcome-avatar">
            <SparklesIcon class="welcome-avatar-icon" />
          </div>
          <Typography.Title :level="4" class="welcome-title">
            {{ workflow.name || 'AI 工作流' }}
          </Typography.Title>
          <Typography.Text type="secondary" class="welcome-desc">
            {{ chat.aiConfig.value.opening_statement || '你好！有什么可以帮助你的吗？' }}
          </Typography.Text>

          <!-- 建议问题 -->
          <div v-if="chat.aiConfig.value.suggested_questions?.length" class="suggested-questions">
            <button
              v-for="(q, idx) in chat.aiConfig.value.suggested_questions"
              :key="idx"
              class="suggested-btn"
              @click="handleSuggestedQuestion(q)"
            >
              {{ q }}
            </button>
          </div>
        </div>

        <!-- 消息列表 -->
        <div v-else class="messages-container">
          <div
            v-for="msg in chat.messages.value"
            :key="msg.id"
            class="message-row"
            :class="`message-row--${msg.role}`"
          >
            <!-- 用户消息 -->
            <template v-if="msg.role === 'user'">
              <div class="msg-avatar msg-avatar--user">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              </div>
              <div class="msg-content-wrapper">
                <div class="msg-bubble msg-bubble--user">
                  <ContentBlockRenderer
                    v-if="msg.blocks?.length"
                    :blocks="msg.blocks"
                  />
                  <template v-else>{{ msg.content }}</template>
                </div>
              </div>
            </template>

            <!-- 助手消息 -->
            <template v-else>
              <div class="msg-avatar msg-avatar--assistant">
                <SparklesIcon class="msg-avatar-icon" />
              </div>
              <div class="msg-content-wrapper">
                <!-- ContentBlock 渲染 -->
                <div class="msg-bubble msg-bubble--assistant">
                  <ContentBlockRenderer
                    v-if="msg.blocks?.length"
                    :blocks="msg.blocks"
                    :streaming="chat.isStreaming.value && msg === chat.messages.value[chat.messages.value.length - 1]"
                  />
                  <!-- 兼容：blocks 为空时回退到旧渲染 -->
                  <AiBubbleContent
                    v-else
                    :content="msg.content"
                    :loading="msg.loading"
                    :streaming="chat.isStreaming.value && msg === chat.messages.value[chat.messages.value.length - 1]"
                    :error="msg.error"
                  />
                  <!-- Loading indicator -->
                  <div v-if="msg.loading && !msg.blocks?.length && !msg.content" class="msg-loading">
                    <span class="loading-dot" /><span class="loading-dot" /><span class="loading-dot" />
                  </div>
                </div>

                <!-- 人机交互卡片（放在消息底部） -->
                <AIInteractionCard
                  v-if="chat.interactionData.value && msg === chat.messages.value[chat.messages.value.length - 1]"
                  :data="chat.interactionData.value"
                  :countdown="chat.interactionCountdown.value"
                  @confirm="handleInteractionConfirm"
                  @skip="chat.skipInteraction()"
                />

                <!-- 元信息：Token 用量 + 操作 -->
                <div v-if="msg.metadata?.usage || !msg.loading" class="msg-usage">
                  <span v-if="msg.metadata?.usage?.prompt_tokens != null" class="usage-item usage-item--input">
                    <ArrowBigUpIcon class="usage-icon" /> {{ msg.metadata.usage.prompt_tokens }}
                  </span>
                  <span v-if="msg.metadata?.usage?.completion_tokens != null" class="usage-item usage-item--output">
                    <ArrowBigDownIcon class="usage-icon" /> {{ msg.metadata.usage.completion_tokens }}
                  </span>
                  <Tooltip title="重新生成" v-if="!msg.loading">
                    <span
                      class="regenerate-btn"
                      :class="{ 'regenerate-btn--disabled': chat.isStreaming.value }"
                      @click="!chat.isStreaming.value && chat.regenerateMessage(msg.id)"
                    >
                      <RefreshCwIcon class="regenerate-icon" />
                    </span>
                  </Tooltip>
                </div>
              </div>
            </template>
          </div>
        </div>
      </div>

      <!-- 底部输入区 -->
      <div class="chat-footer">
        <div class="chat-footer-inner">
          <!-- 浮动操作条 -->
          <div v-if="chat.isStreaming.value || !isAtBottom" class="action-bar">
            <button v-if="!isAtBottom" class="float-btn scroll-btn" @click="scrollToBottom">
              <ArrowDownIcon class="float-btn-icon" />
              回到底部
            </button>
            <button v-if="chat.isStreaming.value" class="float-btn stop-btn" @click="chat.stopGeneration()">
              <StopIcon class="float-btn-icon" />
              停止生成
            </button>
          </div>

          <ChatSender
            :loading="chat.isStreaming.value"
            :placeholder="`问问 ${workflow.name || 'AI'}...`"
            @send="handleSend"
            @upload-files="handleUploadFiles"
          >
            <template #toolbar-right>
              <Button
                type="text"
                size="small"
                class="clear-btn"
                :disabled="chat.isStreaming.value || !hasMessages"
                @click="chat.startNewConversation()"
              >
                <template #icon><PlusIcon class="size-3" /></template>
                新对话
              </Button>
            </template>
          </ChatSender>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.ai-chat-panel {
  display: flex;
  height: 100%;
  overflow: hidden;
  background: hsl(var(--accent) / 30%);
}

/* ============ 侧栏 ============ */
.sidebar {
  display: flex;
  flex-direction: column;
  width: 240px;
  min-width: 240px;
  max-width: 240px;
  background: hsl(var(--background));
  overflow: hidden;
  border-right: 1px solid hsl(var(--border));
  transition: width 0.2s, min-width 0.2s;
}

.sidebar--collapsed {
  width: 0;
  min-width: 0;
  overflow: hidden;
  border-right: none;
}

.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  border-bottom: 1px solid hsl(var(--border));
}

.sidebar-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  font-size: 14px;
  color: hsl(var(--foreground));
  min-width: 0;
  overflow: hidden;
}

.sidebar-title span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sidebar-title-icon {
  width: 20px;
  height: 20px;
  color: #1677ff;
}

.sidebar-toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  background: transparent;
  border-radius: 6px;
  color: hsl(var(--muted-foreground));
  cursor: pointer;
  transition: all 0.2s;
}

.sidebar-toggle:hover {
  background: hsl(var(--accent));
  color: hsl(var(--foreground));
}

.new-conv-btn {
  margin: 12px 12px;
  width: calc(100% - 24px);
}

.conv-list {
  flex: 1;
  overflow-y: auto;
  padding: 4px 8px;
}

.conv-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: background-color 0.2s;
  position: relative;
}

.conv-item:hover {
  background: hsl(var(--accent));
}

.conv-item--active {
  background: hsl(var(--accent));
}

.conv-item-icon {
  width: 14px;
  height: 14px;
  color: hsl(var(--muted-foreground));
  flex-shrink: 0;
}

.conv-item-title {
  flex: 1;
  font-size: 13px;
  color: hsl(var(--foreground));
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.conv-item-delete {
  display: none;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border: none;
  background: transparent;
  border-radius: 4px;
  color: hsl(var(--muted-foreground));
  cursor: pointer;
  flex-shrink: 0;
}

.conv-item:hover .conv-item-delete {
  display: flex;
}

.conv-item-delete:hover {
  color: #ff4d4f;
  background: #fff1f0;
}

.conv-empty {
  text-align: center;
  padding: 24px 0;
  font-size: 13px;
  color: hsl(var(--muted-foreground));
}

/* ============ 侧栏展开按钮 ============ */
.sidebar-expand-bar {
  position: absolute;
  top: 12px;
  left: 12px;
  z-index: 10;
}

.sidebar-expand-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: 1px solid hsl(var(--border));
  border-radius: 8px;
  background: hsl(var(--background));
  color: hsl(var(--muted-foreground));
  cursor: pointer;
  transition: all 0.2s;
}

.sidebar-expand-btn:hover {
  border-color: var(--ant-color-primary, #1677ff);
  color: var(--ant-color-primary, #1677ff);
  background: hsl(var(--accent));
}

/* ============ 主对话区 ============ */
.chat-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: hsl(var(--background));
  min-width: 0;
  overflow: hidden;
  position: relative;
}

.chat-body {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  scroll-behavior: smooth;
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
  width: 60px;
  height: 60px;
  margin-bottom: 20px;
  background: linear-gradient(135deg, #1677ff 0%, #722ed1 100%);
  border-radius: 18px;
  box-shadow: 0 8px 24px rgba(22, 119, 255, 0.25);
}

.welcome-avatar-icon {
  font-size: 30px;
  color: #fff;
}

.welcome-title {
  margin-bottom: 8px !important;
  color: hsl(var(--foreground));
}

.welcome-desc {
  max-width: 460px;
  font-size: 14px;
  line-height: 1.8;
}

.suggested-questions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: center;
  margin-top: 24px;
  max-width: 600px;
}

.suggested-btn {
  padding: 8px 16px;
  font-size: 13px;
  color: var(--ant-color-primary, #1677ff);
  background: hsl(var(--accent));
  border: 1px solid hsl(var(--border));
  border-radius: 20px;
  cursor: pointer;
  transition: all 0.2s;
}

.suggested-btn:hover {
  background: hsl(var(--accent) / 80%);
  border-color: var(--ant-color-primary, #1677ff);
}

/* 消息列表 */
.messages-container {
  max-width: 800px;
  margin: 0 auto;
  padding: 16px 8px;
}

.message-row {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
}

.message-row--user {
  flex-direction: row;
}

.msg-avatar {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  flex-shrink: 0;
  margin-top: 2px;
}

.msg-avatar--user {
  background: #1677ff;
}

.msg-avatar--assistant {
  background: linear-gradient(135deg, #1677ff 0%, #722ed1 100%);

}

.msg-avatar-icon {
  width: 18px;
  height: 18px;
  color: #fff;
}

.msg-content-wrapper {
  flex: 1;
  min-width: 0;
}

.msg-bubble {
  line-height: 1.7;
  word-break: break-word;
}

.msg-bubble--user {
  padding: 10px 16px;
  background: hsl(var(--accent));
  color: hsl(var(--foreground));
  border-radius: 18px 18px 18px 4px;
  border: none;
  font-size: 14px;
  white-space: pre-wrap;
}

.msg-bubble--assistant {
  border: none;
  font-size: 14px;
}

.msg-usage {
  margin-top: 4px;
}

.usage-item {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  margin-right: 8px;
  font-size: 11px;
  color: #999;
}

.usage-icon {
  font-size: 12px;
}

.usage-item--input .usage-icon {
  color: #1677ff;
}

.usage-item--output .usage-icon {
  color: #52c41a;
}

.regenerate-btn {
  display: inline-flex;
  align-items: center;
  cursor: pointer;
  color: #999;
  transition: color 0.2s;
}

.regenerate-btn:hover {
  color: #1677ff;
}

.regenerate-btn--disabled {
  cursor: not-allowed;
  opacity: 0.3;
}

.regenerate-btn--disabled:hover {
  color: #999;
}

.regenerate-icon {
  font-size: 12px;
}

/* ============ 底部输入区 ============ */
.chat-footer {
  flex-shrink: 0;
  padding: 0 16px 20px;
  background: transparent;
}

.chat-footer-inner {
  max-width: 800px;
  margin: 0 auto;
  position: relative;
}

.action-bar {
  display: flex;
  gap: 8px;
  justify-content: center;
  position: absolute;
  bottom: 100%;
  left: 50%;
  transform: translateX(-50%);
  margin-bottom: 8px;
  z-index: 10;
}

.float-btn {
  display: flex;
  gap: 6px;
  align-items: center;
  padding: 6px 18px;
  font-size: 13px;
  cursor: pointer;
  border-radius: 20px;
  transition: all 0.2s;
}

.float-btn-icon {
  width: 14px;
  height: 14px;
}

.scroll-btn {
  color: hsl(var(--foreground));
  background: hsl(var(--background));
  border: 1px solid hsl(var(--border));
}

.scroll-btn:hover {
  color: var(--ant-color-primary, #1677ff);
  border-color: var(--ant-color-primary, #1677ff);
  background: hsl(var(--accent));
}

.stop-btn {
  color: #ff4d4f;
  background: hsl(var(--background));
  border: 1px solid #ffccc7;
}

.stop-btn:hover {
  background: hsl(var(--accent));
  border-color: #ff4d4f;
}

.clear-btn {
  font-size: 12px;
  color: hsl(var(--muted-foreground));
}

.clear-btn:hover:not(:disabled) {
  color: var(--ant-color-primary, #1677ff);
}

/* ============ compact 模式顶栏 ============ */
.compact-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 44px;
  padding: 0 12px;
  border-bottom: 1px solid hsl(var(--border));
  background: hsl(var(--background));
  flex-shrink: 0;
}

.compact-topbar-left {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.compact-topbar-icon {
  width: 18px;
  height: 18px;
  color: #1677ff;
  flex-shrink: 0;
}

.compact-topbar-title {
  font-size: 13px;
  font-weight: 500;
  color: hsl(var(--foreground));
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.compact-topbar-right {
  display: flex;
  align-items: center;
  gap: 4px;
}

.compact-topbar-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  background: transparent;
  border-radius: 6px;
  color: hsl(var(--muted-foreground));
  cursor: pointer;
  transition: all 0.2s;
}

.compact-topbar-btn:hover {
  background: hsl(var(--accent));
  color: hsl(var(--foreground));
}

/* 会话下拉菜单 */
.conv-dropdown {
  width: 260px;
  background: hsl(var(--background));
  border-radius: 8px;
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.08);
  overflow: hidden;
}

.conv-dropdown-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px 6px;
  font-size: 13px;
  font-weight: 500;
  color: hsl(var(--foreground));
}

.conv-dropdown-list {
  max-height: 300px;
  overflow-y: auto;
  padding: 4px 6px 8px;
}

.conv-dropdown-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 10px;
  border-radius: 6px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.conv-dropdown-item:hover {
  background: hsl(var(--accent));
}

.conv-dropdown-item--active {
  background: hsl(var(--accent));
}

.conv-dropdown-item-title {
  font-size: 13px;
  color: hsl(var(--foreground));
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
}

.conv-dropdown-item-delete {
  display: none;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border: none;
  background: transparent;
  border-radius: 4px;
  color: hsl(var(--muted-foreground));
  cursor: pointer;
  flex-shrink: 0;
}

.conv-dropdown-item:hover .conv-dropdown-item-delete {
  display: flex;
}

.conv-dropdown-item-delete:hover {
  color: #ff4d4f;
  background: #fff1f0;
}

.conv-dropdown-empty {
  text-align: center;
  padding: 16px 0;
  font-size: 12px;
  color: hsl(var(--muted-foreground));
}

/* compact 模式 */
.ai-chat-panel--compact {
  background: hsl(var(--background));
}

.ai-chat-panel--compact .chat-welcome {
  padding: 20px 16px;
}

.ai-chat-panel--compact .welcome-avatar {
  width: 48px;
  height: 48px;
  border-radius: 14px;
  margin-bottom: 12px;
}

.ai-chat-panel--compact .welcome-avatar-icon {
  font-size: 24px;
}

.msg-loading {
  display: flex;
  gap: 4px;
  padding: 8px 0;
}

.loading-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: hsl(var(--primary) / 60%);
  animation: dot-pulse 1.4s ease-in-out infinite;
}

.loading-dot:nth-child(2) { animation-delay: 0.2s; }
.loading-dot:nth-child(3) { animation-delay: 0.4s; }

@keyframes dot-pulse {
  0%, 80%, 100% { opacity: 0.3; transform: scale(0.8); }
  40% { opacity: 1; transform: scale(1); }
}

</style>
