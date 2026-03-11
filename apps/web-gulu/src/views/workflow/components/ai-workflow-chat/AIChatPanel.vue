<script setup lang="ts">
import { ref, computed, onMounted, watch, nextTick, onUnmounted } from 'vue';

import { Button, Typography, Tooltip } from 'ant-design-vue';
import { createIconifyIcon } from '@vben/icons';

import type { Workflow } from '#/api/workflow';
import AiBubbleContent from '#/components/ai-chat/AiBubbleContent.vue';
import ChatSender from '#/components/ai-chat/ChatSender.vue';
import type { ChatSenderAttachment } from '#/components/ai-chat/ChatSender.vue';
import { ContentBlockRenderer } from '../shared/blocks';
import type { ArtifactBlock as ArtifactBlockType } from '../shared/types';
import AIInteractionCard from './AIInteractionCard.vue';
import SplitPanelLayout from './SplitPanelLayout.vue';
import ChatSidebar from './ChatSidebar.vue';
import ArtifactPanel from './ArtifactPanel.vue';
import { useAIWorkflowChat } from './useAIWorkflowChat';

const PlusIcon = createIconifyIcon('lucide:plus');
const StopIcon = createIconifyIcon('lucide:square');
const ArrowDownIcon = createIconifyIcon('lucide:arrow-down');
const SparklesIcon = createIconifyIcon('lucide:sparkles');
const ArrowBigUpIcon = createIconifyIcon('lucide:arrow-big-up');
const ArrowBigDownIcon = createIconifyIcon('lucide:arrow-big-down');
const RefreshCwIcon = createIconifyIcon('lucide:refresh-cw');
const PencilIcon = createIconifyIcon('lucide:pencil');
const CheckIcon = createIconifyIcon('lucide:check');
const XIcon = createIconifyIcon('lucide:x');
const PaperclipIcon = createIconifyIcon('lucide:paperclip');
const PanelLeftOpen = createIconifyIcon('lucide:panel-left-open');

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
const activeArtifact = ref<ArtifactBlockType | null>(null);

const hasMessages = computed(() => chat.messages.value.length > 0);

function openArtifactPanel(block: ArtifactBlockType) {
  activeArtifact.value = block;
}

function closeArtifactPanel() {
  activeArtifact.value = null;
}

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
  () => chat.currentConversation.value?.id,
  () => {
    activeArtifact.value = null;
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

// ============ 编辑用户消息 ============
const editingMsgId = ref<string | null>(null);
const editingText = ref('');
const editingAttachments = ref<ChatSenderAttachment[]>([]);
const editFileInputRef = ref<HTMLInputElement | null>(null);

function startEditing(msg: InstanceType<typeof Object> & { id: string; content: string; blocks?: any[]; attachments?: any[] }) {
  editingMsgId.value = msg.id;
  editingText.value = msg.content || '';
  editingAttachments.value = [];

  if (msg.attachments?.length) {
    editingAttachments.value = msg.attachments
      .filter((a: any) => a.status === 'done' && a.url)
      .map((a: any) => ({ ...a }));
  } else if (msg.blocks?.length) {
    for (const block of msg.blocks) {
      if (block.type === 'image' && block.url) {
        editingAttachments.value.push({
          id: `att_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          url: block.url,
          name: block.name || 'image',
          size: 0,
          mimeType: 'image/*',
          type: 'image',
          status: 'done',
        });
      }
    }
  }
}

function cancelEditing() {
  editingMsgId.value = null;
  editingText.value = '';
  editingAttachments.value = [];
}

function handleEditConfirm() {
  if (!editingMsgId.value) return;
  if (!editingText.value.trim() && !editingAttachments.value.length) return;
  const doneAttachments = editingAttachments.value.filter((a) => a.status === 'done' && a.url);
  chat.editAndResend(editingMsgId.value, editingText.value, doneAttachments.length > 0 ? doneAttachments : undefined);
  cancelEditing();
}

function triggerEditFileInput() {
  editFileInputRef.value?.click();
}

function handleEditFileChange(e: Event) {
  const input = e.target as HTMLInputElement;
  const files = Array.from(input.files || []);
  if (!files.length) return;
  input.value = '';
  chat.uploadFiles(files).then((results) => {
    editingAttachments.value.push(...results.map((a) => ({
      id: a.id,
      file: a.file,
      url: a.url,
      name: a.name,
      size: a.size,
      mimeType: a.mimeType,
      type: a.type as ChatSenderAttachment['type'],
      status: a.status as ChatSenderAttachment['status'],
      error: a.error,
    })));
  });
}

function removeEditAttachment(id: string) {
  editingAttachments.value = editingAttachments.value.filter((a) => a.id !== id);
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
  <SplitPanelLayout
    :panel-open="!!activeArtifact"
    :class="{ 'ai-chat-panel--compact': compact }"
    class="ai-chat-panel"
  >
    <!-- 侧栏 -->
    <template #sidebar>
      <ChatSidebar
        v-if="!compact"
        :conversations="chat.conversations.value"
        :current-conversation-id="chat.currentConversation.value?.id"
        :current-title="chat.currentConversation.value?.title"
        :workflow-name="workflow.name"
        :compact="compact"
        :collapsed="sidebarCollapsed"
        @update:collapsed="sidebarCollapsed = $event"
        @new-conversation="chat.startNewConversation()"
        @switch-conversation="chat.switchConversation($event)"
        @delete-conversation="chat.deleteConversation($event)"
        @rename-conversation="(id, title) => chat.renameConversation(id, title)"
      />
    </template>

    <!-- 主对话区域（default slot） -->
    <!-- 侧栏收起时的展开按钮 -->
    <div v-if="!compact && sidebarCollapsed" class="sidebar-expand-bar">
      <Tooltip title="展开侧栏" placement="right">
        <button class="sidebar-expand-btn" @click="sidebarCollapsed = false">
          <PanelLeftOpen class="size-4" />
        </button>
      </Tooltip>
    </div>

    <!-- compact 模式顶栏 -->
    <ChatSidebar
      v-if="compact"
      :conversations="chat.conversations.value"
      :current-conversation-id="chat.currentConversation.value?.id"
      :current-title="chat.currentConversation.value?.title"
      :workflow-name="workflow.name"
      compact
      @new-conversation="chat.startNewConversation()"
      @switch-conversation="chat.switchConversation($event)"
      @delete-conversation="chat.deleteConversation($event)"
      @rename-conversation="(id, title) => chat.renameConversation(id, title)"
    />

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
              <div v-if="editingMsgId === msg.id" class="msg-edit-container">
                <input
                  ref="editFileInputRef"
                  type="file"
                  multiple
                  class="msg-edit-file-input"
                  @change="handleEditFileChange"
                />
                <div v-if="editingAttachments.length" class="msg-edit-attachments">
                  <div v-for="att in editingAttachments" :key="att.id" class="msg-edit-att-item">
                    <img v-if="att.type === 'image' && att.url" :src="att.url" :alt="att.name" class="msg-edit-att-thumb" />
                    <span v-else class="msg-edit-att-name">{{ att.name }}</span>
                    <button class="msg-edit-att-remove" @click="removeEditAttachment(att.id)">
                      <XIcon class="size-3" />
                    </button>
                  </div>
                </div>
                <textarea
                  v-model="editingText"
                  class="msg-edit-textarea"
                  rows="3"
                  @keydown.enter.ctrl="handleEditConfirm"
                  @keydown.escape="cancelEditing"
                />
                <div class="msg-edit-actions">
                  <Tooltip title="添加附件">
                    <button class="msg-edit-tool-btn" @click="triggerEditFileInput">
                      <PaperclipIcon class="size-4" />
                    </button>
                  </Tooltip>
                  <div class="msg-edit-actions-right">
                    <button class="msg-edit-cancel-btn" @click="cancelEditing">取消</button>
                    <button
                      class="msg-edit-confirm-btn"
                      :disabled="!editingText.trim() && !editingAttachments.length"
                      @click="handleEditConfirm"
                    >
                      <CheckIcon class="size-3" />
                      发送
                    </button>
                  </div>
                </div>
              </div>
              <div v-else class="msg-bubble-wrapper">
                <div class="msg-bubble msg-bubble--user">
                  <ContentBlockRenderer v-if="msg.blocks?.length" :blocks="msg.blocks" />
                  <template v-else>{{ msg.content }}</template>
                </div>
                <Tooltip title="编辑消息">
                  <button
                    v-if="!chat.isStreaming.value"
                    class="msg-edit-btn"
                    @click="startEditing(msg)"
                  >
                    <PencilIcon class="size-3" />
                  </button>
                </Tooltip>
              </div>
            </div>
          </template>

          <!-- 助手消息 -->
          <template v-else>
            <div class="msg-avatar msg-avatar--assistant">
              <SparklesIcon class="msg-avatar-icon" />
            </div>
            <div class="msg-content-wrapper">
              <div class="msg-bubble msg-bubble--assistant">
                <ContentBlockRenderer
                  v-if="msg.blocks?.length"
                  :blocks="msg.blocks"
                  :streaming="chat.isStreaming.value && msg === chat.messages.value[chat.messages.value.length - 1]"
                  @artifact-open="openArtifactPanel"
                />
                <AiBubbleContent
                  v-else
                  :content="msg.content"
                  :loading="msg.loading"
                  :streaming="chat.isStreaming.value && msg === chat.messages.value[chat.messages.value.length - 1]"
                  :error="msg.error"
                />
                <div v-if="msg.loading && !msg.blocks?.length && !msg.content" class="msg-loading">
                  <span class="loading-dot" /><span class="loading-dot" /><span class="loading-dot" />
                </div>
              </div>

              <AIInteractionCard
                v-if="chat.interactionData.value && msg === chat.messages.value[chat.messages.value.length - 1]"
                :data="chat.interactionData.value"
                :countdown="chat.interactionCountdown.value"
                @confirm="handleInteractionConfirm"
                @skip="chat.skipInteraction()"
              />

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

    <!-- 产物面板 -->
    <template #panel>
      <ArtifactPanel
        v-if="activeArtifact"
        :artifact="activeArtifact"
        @close="closeArtifactPanel"
      />
    </template>
  </SplitPanelLayout>
</template>

<style scoped>
.ai-chat-panel {
  background: hsl(var(--accent) / 30%);
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
.chat-body {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  scroll-behavior: smooth;
  scrollbar-width: thin;
  scrollbar-color: transparent transparent;
}

.chat-body:hover {
  scrollbar-color: hsl(var(--muted-foreground) / 30%) transparent;
}

.chat-body::-webkit-scrollbar {
  width: 6px;
}

.chat-body::-webkit-scrollbar-track {
  background: transparent;
}

.chat-body::-webkit-scrollbar-thumb {
  background: transparent;
  border-radius: 3px;
}

.chat-body:hover::-webkit-scrollbar-thumb {
  background: hsl(var(--muted-foreground) / 30%);
}

.chat-body::-webkit-scrollbar-thumb:hover {
  background: hsl(var(--muted-foreground) / 40%);
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
  border-radius: 10px 10px 10px 4px;
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

.ai-chat-panel--compact .messages-container {
  max-width: none;
  padding: 16px 16px;
}

.ai-chat-panel--compact .chat-footer-inner {
  max-width: none;
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

/* ============ 用户消息编辑 ============ */
.msg-bubble-wrapper {
  position: relative;
}

.msg-edit-btn {
  position: absolute;
  bottom: -4px;
  right: -4px;
  display: none;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border: 1px solid hsl(var(--border));
  background: hsl(var(--background));
  border-radius: 50%;
  color: hsl(var(--muted-foreground));
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
}

.msg-bubble-wrapper:hover .msg-edit-btn {
  display: flex;
}

.msg-edit-btn:hover {
  color: var(--ant-color-primary, #1677ff);
  border-color: var(--ant-color-primary, #1677ff);
  background: hsl(var(--accent));
}

.msg-edit-container {
  background: hsl(var(--background));
  border: 1px solid hsl(var(--border));
  border-radius: 12px;
  padding: 12px;
  transition: border-color 0.2s;
}

.msg-edit-container:focus-within {
  border-color: var(--ant-color-primary, #1677ff);
}

.msg-edit-file-input {
  display: none;
}

.msg-edit-attachments {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 8px;
}

.msg-edit-att-item {
  position: relative;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px;
  background: hsl(var(--accent));
  border: 1px solid hsl(var(--border));
  border-radius: 8px;
}

.msg-edit-att-thumb {
  width: 48px;
  height: 48px;
  object-fit: cover;
  border-radius: 6px;
}

.msg-edit-att-name {
  font-size: 12px;
  color: hsl(var(--foreground));
  padding: 0 6px;
  max-width: 80px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.msg-edit-att-remove {
  position: absolute;
  top: -6px;
  right: -6px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border: 1px solid hsl(var(--border));
  background: hsl(var(--background));
  border-radius: 50%;
  color: hsl(var(--muted-foreground));
  cursor: pointer;
  transition: all 0.2s;
  opacity: 0;
}

.msg-edit-att-item:hover .msg-edit-att-remove {
  opacity: 1;
}

.msg-edit-att-remove:hover {
  color: #ff4d4f;
  border-color: #ff4d4f;
  background: #fff2f0;
}

.msg-edit-textarea {
  width: 100%;
  border: none;
  outline: none;
  background: transparent;
  font-size: 14px;
  line-height: 1.6;
  color: hsl(var(--foreground));
  resize: vertical;
  min-height: 60px;
  font-family: inherit;
}

.msg-edit-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 8px;
}

.msg-edit-actions-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.msg-edit-tool-btn {
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

.msg-edit-tool-btn:hover {
  background: hsl(var(--accent));
  color: hsl(var(--foreground));
}

.msg-edit-cancel-btn {
  padding: 4px 12px;
  font-size: 13px;
  border: 1px solid hsl(var(--border));
  background: hsl(var(--background));
  border-radius: 6px;
  color: hsl(var(--muted-foreground));
  cursor: pointer;
  transition: all 0.2s;
}

.msg-edit-cancel-btn:hover {
  color: hsl(var(--foreground));
  border-color: hsl(var(--foreground) / 30%);
}

.msg-edit-confirm-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 14px;
  font-size: 13px;
  border: none;
  background: var(--ant-color-primary, #1677ff);
  color: #fff;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}

.msg-edit-confirm-btn:hover:not(:disabled) {
  opacity: 0.85;
}

.msg-edit-confirm-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
</style>
