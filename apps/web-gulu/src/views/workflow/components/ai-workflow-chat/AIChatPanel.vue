<script setup lang="ts">
import { ref, computed, onMounted, watch, nextTick, onUnmounted } from 'vue';

import { Button, Dropdown, Typography, Tooltip, Popconfirm, Tag } from 'ant-design-vue';
import { Sender } from 'ant-design-x-vue';
import { createIconifyIcon } from '@vben/icons';

import type { Workflow } from '#/api/workflow';
import AiBubbleContent from '#/components/ai-chat/AiBubbleContent.vue';
import AIExecCard from './AIExecCard.vue';
import { useAIWorkflowChat } from './useAIWorkflowChat';

const PlusIcon = createIconifyIcon('lucide:plus');
const TrashIcon = createIconifyIcon('lucide:trash-2');
const StopIcon = createIconifyIcon('lucide:square');
const ArrowDownIcon = createIconifyIcon('lucide:arrow-down');
const MessageCircle = createIconifyIcon('lucide:message-circle');
const SparklesIcon = createIconifyIcon('lucide:sparkles');

interface Props {
  workflow: Workflow;
  envId?: number;
  compact?: boolean;
  persistConversation?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  envId: 0,
  compact: false,
  persistConversation: true,
});

const chat = useAIWorkflowChat({
  workflow: props.workflow,
  envId: props.envId,
  persistConversation: props.persistConversation,
});

const inputText = ref('');
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

// 监听最新消息内容变化（流式更新时滚动）
watch(
  () => {
    const msgs = chat.messages.value;
    const last = msgs[msgs.length - 1];
    return last?.content?.length || 0;
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

function handleSend(text: string) {
  if (!text.trim()) return;
  inputText.value = '';
  chat.sendMessage(text);
}

function handleSuggestedQuestion(q: string) {
  chat.sendMessage(q);
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
          <button class="sidebar-toggle" @click="sidebarCollapsed = !sidebarCollapsed">
            <MessageCircle class="size-4" />
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
                  {{ msg.content }}
                </div>
              </div>
            </template>

            <!-- 助手消息 -->
            <template v-else>
              <div class="msg-avatar msg-avatar--assistant">
                <SparklesIcon class="msg-avatar-icon" />
              </div>
              <div class="msg-content-wrapper">
                <!-- 执行过程卡片 -->
                <AIExecCard
                  v-if="msg.stepEvents?.length || msg.toolCalls?.length"
                  :step-events="msg.stepEvents"
                  :tool-calls="msg.toolCalls"
                />

                <!-- AI 响应内容 -->
                <div class="msg-bubble msg-bubble--assistant">
                  <AiBubbleContent
                    :content="msg.content"
                    :thinking="msg.thinking"
                    :loading="msg.loading"
                    :streaming="chat.isStreaming.value && msg === chat.messages.value[chat.messages.value.length - 1]"
                    :error="msg.error"
                  />
                </div>

                <!-- Token 用量 -->
                <div v-if="msg.metadata?.usage" class="msg-usage">
                  <Tag color="default" class="usage-tag">
                    {{ msg.metadata.usage.total_tokens }} tokens
                  </Tag>
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

          <!-- 输入卡片 -->
          <div class="sender-card">
            <Sender
              v-model:value="inputText"
              :loading="chat.isStreaming.value"
              :placeholder="`问问 ${workflow.name || 'AI'}...`"
              @submit="handleSend"
            />
            <div class="sender-toolbar">
              <div class="toolbar-left" />
              <div class="toolbar-right">
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
              </div>
            </div>
          </div>
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
  background: #f5f7fa;
}

/* ============ 侧栏 ============ */
.sidebar {
  display: flex;
  flex-direction: column;
  width: 240px;
  min-width: 240px;
  background: #fff;
  border-right: 1px solid #eee;
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
  border-bottom: 1px solid #f0f0f0;
}

.sidebar-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  font-size: 14px;
  color: #333;
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
  color: #999;
  cursor: pointer;
  transition: all 0.2s;
}

.sidebar-toggle:hover {
  background: #f0f0f0;
  color: #333;
}

.new-conv-btn {
  margin: 12px 16px;
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
  background: #f5f7fa;
}

.conv-item--active {
  background: #e6f4ff;
}

.conv-item-icon {
  width: 14px;
  height: 14px;
  color: #999;
  flex-shrink: 0;
}

.conv-item-title {
  flex: 1;
  font-size: 13px;
  color: #333;
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
  color: #999;
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
  color: #999;
}

/* ============ 主对话区 ============ */
.chat-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  overflow: hidden;
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
  color: #1a1a2e;
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
  color: #1677ff;
  background: #f0f5ff;
  border: 1px solid #d6e4ff;
  border-radius: 20px;
  cursor: pointer;
  transition: all 0.2s;
}

.suggested-btn:hover {
  background: #e6f4ff;
  border-color: #91caff;
  box-shadow: 0 2px 8px rgba(22, 119, 255, 0.1);
}

/* 消息列表 */
.messages-container {
  max-width: 800px;
  margin: 0 auto;
  padding: 24px 16px 16px;
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
  border-radius: 16px;
  line-height: 1.7;
  word-break: break-word;
}

.msg-bubble--user {
  padding: 10px 16px;
  background: #e6f4ff;
  color: #1a1a2e;
  border-radius: 18px 18px 18px 4px;
  border: 1px solid #bae0ff;
  font-size: 14px;
  white-space: pre-wrap;
}

.msg-bubble--assistant {
  padding: 14px 18px;
  background: #fff;
  border: 1px solid #f0f0f0;
  border-radius: 18px 18px 18px 4px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
  font-size: 14px;
}

.msg-usage {
  margin-top: 4px;
}

.usage-tag {
  font-size: 11px;
  opacity: 0.6;
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
}

.action-bar {
  display: flex;
  gap: 8px;
  justify-content: center;
  margin-bottom: 12px;
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
  color: #595959;
  background: #fff;
  border: 1px solid #d9d9d9;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.scroll-btn:hover {
  color: #1677ff;
  border-color: #1677ff;
  background: #f0f5ff;
}

.stop-btn {
  color: #ff4d4f;
  background: #fff;
  border: 1px solid #ffccc7;
  box-shadow: 0 2px 8px rgba(255, 77, 79, 0.1);
}

.stop-btn:hover {
  background: #fff1f0;
  border-color: #ff4d4f;
}

.sender-card {
  padding: 8px 12px;
  background: #fff;
  border: 1px solid #e0e0e0;
  border-radius: 24px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
  transition: box-shadow 0.3s, border-color 0.3s;
}

.sender-card:focus-within {
  border-color: #c0c0c0;
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
  padding: 4px 0 !important;
  resize: none;
  font-size: 15px;
}

.sender-card :deep(.ant-input:focus),
.sender-card :deep(textarea:focus) {
  box-shadow: none !important;
}

.sender-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 4px;
}

.toolbar-left {
  display: flex;
  gap: 4px;
  align-items: center;
}

.toolbar-right {
  display: flex;
  gap: 4px;
  align-items: center;
}

.clear-btn {
  font-size: 12px;
  color: #999;
}

.clear-btn:hover:not(:disabled) {
  color: #1677ff;
}

/* ============ compact 模式顶栏 ============ */
.compact-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 44px;
  padding: 0 12px;
  border-bottom: 1px solid #f0f0f0;
  background: #fff;
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
  color: #333;
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
  color: #666;
  cursor: pointer;
  transition: all 0.2s;
}

.compact-topbar-btn:hover {
  background: #f0f0f0;
  color: #1677ff;
}

/* 会话下拉菜单 */
.conv-dropdown {
  width: 260px;
  background: #fff;
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
  color: #333;
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
  background: #f5f7fa;
}

.conv-dropdown-item--active {
  background: #e6f4ff;
}

.conv-dropdown-item-title {
  font-size: 13px;
  color: #333;
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
  color: #999;
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
  color: #999;
}

/* compact 模式 */
.ai-chat-panel--compact {
  background: #fff;
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
</style>
