<script setup lang="ts">
import { h, ref, computed, onUnmounted } from 'vue';
import { BubbleList } from 'ant-design-x-vue';
import type { BubbleListProps } from 'ant-design-x-vue';
import { Button, Tag, Typography, Image as AImage, Tooltip, message } from 'ant-design-vue';
import { createIconifyIcon } from '@vben/icons';
import { useAiChat } from './composables/useAiChat';
import AiBubbleContent from './AiBubbleContent.vue';
import ChatSender from './ChatSender.vue';
import type { ChatSenderAttachment } from './ChatSender.vue';
import type { AiChatConfig, AiChatMessage, ImageAttachment } from './types';

const StopIcon = createIconifyIcon('lucide:square');
const TrashIcon = createIconifyIcon('lucide:trash-2');
const ArrowDownIcon = createIconifyIcon('lucide:arrow-down');
const BotIcon = createIconifyIcon('lucide:bot');
const PencilIcon = createIconifyIcon('lucide:pencil');
const CheckIcon = createIconifyIcon('lucide:check');
const XIcon = createIconifyIcon('lucide:x');
const PaperclipIcon = createIconifyIcon('lucide:paperclip');

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
  editAndResend,
  stopGeneration,
  clearMessages,
  regenerate,
} = useAiChat(props.config);

const listRef = ref<InstanceType<typeof BubbleList> | null>(null);
const isAtBottom = ref(true);

function handleListScroll(e: Event) {
  const el = e.target as HTMLElement;
  isAtBottom.value = el.scrollHeight - el.scrollTop - el.clientHeight <= 30;
}

function scrollToBottom() {
  const el = (listRef.value as any)?.nativeElement as HTMLElement | undefined;
  if (el) {
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    isAtBottom.value = true;
  }
}

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

const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];

function handleSend(text: string, attachments: ChatSenderAttachment[]) {
  if (!text.trim() && !attachments.length) return;
  const images: ImageAttachment[] = attachments
    .filter((a) => a.type === 'image' && a.url)
    .map((a) => ({
      id: a.id,
      file: a.file,
      url: a.url!,
      name: a.name,
      size: a.size,
      status: 'done' as const,
    }));
  sendMessage(text, images.length ? images : undefined);
}

function handleUploadFiles(files: File[], callback: (results: ChatSenderAttachment[]) => void) {
  const results: ChatSenderAttachment[] = [];
  for (const file of files) {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      message.warning('仅支持 PNG、JPG、GIF、WebP 格式');
      continue;
    }
    if (file.size > MAX_IMAGE_SIZE) {
      message.warning('图片大小不能超过 5MB');
      continue;
    }
    const url = URL.createObjectURL(file);
    results.push({
      id: `img_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      file,
      url,
      name: file.name,
      size: file.size,
      mimeType: file.type,
      type: 'image',
      status: 'done',
    });
  }
  callback(results);
}

function handleRegenerate(messageId: string) {
  regenerate(messageId);
}

// ============ 编辑用户消息 ============
const editingMsgId = ref<string | null>(null);
const editingText = ref('');
const editingImages = ref<ChatSenderAttachment[]>([]);
const editFileInputRef = ref<HTMLInputElement | null>(null);

function startEditing(msg: AiChatMessage) {
  editingMsgId.value = msg.id;
  editingText.value = msg.content || '';
  editingImages.value = [];
  if (msg.images?.length) {
    editingImages.value = msg.images.map((img) => ({
      id: img.id,
      file: img.file,
      url: img.url,
      name: img.name,
      size: img.size,
      mimeType: 'image/*',
      type: 'image' as const,
      status: 'done' as const,
    }));
  }
}

function cancelEditing() {
  editingMsgId.value = null;
  editingText.value = '';
  editingImages.value = [];
}

function handleEditConfirm() {
  if (!editingMsgId.value) return;
  if (!editingText.value.trim() && !editingImages.value.length) return;
  const images: ImageAttachment[] = editingImages.value
    .filter((a) => a.type === 'image' && a.url)
    .map((a) => ({
      id: a.id,
      file: a.file,
      url: a.url!,
      name: a.name,
      size: a.size,
      status: 'done' as const,
    }));
  editAndResend(editingMsgId.value, editingText.value, images.length ? images : undefined);
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
  for (const file of files) {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      message.warning('仅支持 PNG、JPG、GIF、WebP 格式');
      continue;
    }
    if (file.size > MAX_IMAGE_SIZE) {
      message.warning('图片大小不能超过 5MB');
      continue;
    }
    const url = URL.createObjectURL(file);
    editingImages.value.push({
      id: `img_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      file,
      url,
      name: file.name,
      size: file.size,
      mimeType: file.type,
      type: 'image',
      status: 'done',
    });
  }
}

function removeEditImage(id: string) {
  editingImages.value = editingImages.value.filter((a) => a.id !== id);
}

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
        @scroll="handleListScroll"
      >
        <template #message="{ item }">
          <template v-if="item.role === 'user'">
            <!-- 编辑态 -->
            <div v-if="editingMsgId === (item.content as AiChatMessage).id" class="user-edit-container">
              <input
                ref="editFileInputRef"
                type="file"
                multiple
                accept="image/png,image/jpeg,image/gif,image/webp"
                class="user-edit-file-input"
                @change="handleEditFileChange"
              />
              <div v-if="editingImages.length" class="user-edit-images">
                <div v-for="att in editingImages" :key="att.id" class="user-edit-img-item">
                  <img :src="att.url" :alt="att.name" class="user-edit-img-thumb" />
                  <button class="user-edit-img-remove" @click="removeEditImage(att.id)">
                    <XIcon class="size-3" />
                  </button>
                </div>
              </div>
              <textarea
                v-model="editingText"
                class="user-edit-textarea"
                rows="3"
                @keydown.enter.ctrl="handleEditConfirm"
                @keydown.escape="cancelEditing"
              />
              <div class="user-edit-actions">
                <Tooltip title="添加图片">
                  <button class="user-edit-tool-btn" @click="triggerEditFileInput">
                    <PaperclipIcon class="size-4" />
                  </button>
                </Tooltip>
                <div class="user-edit-actions-right">
                  <button class="user-edit-cancel-btn" @click="cancelEditing">取消</button>
                  <button
                    class="user-edit-confirm-btn"
                    :disabled="!editingText.trim() && !editingImages.length"
                    @click="handleEditConfirm"
                  >
                    <CheckIcon class="size-3" />
                    发送
                  </button>
                </div>
              </div>
            </div>
            <!-- 非编辑态 -->
            <div v-else class="user-message-wrapper">
              <div class="user-message">
                <div v-if="(item.content as AiChatMessage).images?.length" class="user-images">
                  <AImage.PreviewGroup>
                    <AImage
                      v-for="img in (item.content as AiChatMessage).images"
                      :key="img.id"
                      :src="img.url"
                      :alt="img.name"
                      class="user-image-thumb"
                      :style="{ maxWidth: '200px', maxHeight: '200px', borderRadius: '8px' }"
                    />
                  </AImage.PreviewGroup>
                </div>
                <div v-if="(item.content as AiChatMessage).content">
                  {{ (item.content as AiChatMessage).content }}
                </div>
              </div>
              <Tooltip title="编辑消息">
                <button
                  v-if="!isStreaming"
                  class="user-msg-edit-btn"
                  @click="startEditing(item.content as AiChatMessage)"
                >
                  <PencilIcon class="size-3" />
                </button>
              </Tooltip>
            </div>
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
        <!-- 浮动操作条 -->
        <div v-if="isStreaming || !isAtBottom" class="action-bar">
          <button v-if="!isAtBottom" class="float-btn scroll-btn" @click="scrollToBottom">
            <ArrowDownIcon class="float-btn-icon" />
            回到底部
          </button>
          <button v-if="isStreaming" class="float-btn stop-btn" @click="stopGeneration">
            <StopIcon class="float-btn-icon" />
            停止生成
          </button>
        </div>

        <ChatSender
          :loading="isStreaming"
          :placeholder="`问问 ${modelName || 'AI'}...`"
          accept="image/png,image/jpeg,image/gif,image/webp"
          attach-button-tooltip="添加图片"
          @send="handleSend"
          @upload-files="handleUploadFiles"
        >
          <template #toolbar-right>
            <Button
              type="text"
              size="small"
              class="clear-btn"
              :disabled="isStreaming || messages.length === 0"
              @click="clearMessages"
            >
              <template #icon><TrashIcon class="clear-icon" /></template>
              清空
            </Button>
          </template>
        </ChatSender>
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

/* BubbleList */
.chat-bubble-list :deep(.ant-bubble) {
  margin-bottom: 8px;
}

/* 用户消息 */
.user-message {
  white-space: pre-wrap;
  word-break: break-word;
  line-height: 1.6;
}

.user-images {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 8px;
}

.user-images :deep(.ant-image img) {
  max-width: 200px;
  max-height: 200px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.3);
  object-fit: contain;
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

/* ============ 用户消息编辑 ============ */
.user-message-wrapper {
  position: relative;
}

.user-msg-edit-btn {
  position: absolute;
  bottom: -4px;
  left: -4px;
  display: none;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border: 1px solid #d9d9d9;
  background: #fff;
  border-radius: 50%;
  color: #999;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
}

.user-message-wrapper:hover .user-msg-edit-btn {
  display: flex;
}

.user-msg-edit-btn:hover {
  color: #1677ff;
  border-color: #1677ff;
  background: #f0f5ff;
}

.user-edit-container {
  background: #fff;
  border: 1px solid #d9d9d9;
  border-radius: 12px;
  padding: 12px;
  min-width: 300px;
  max-width: 520px;
  transition: border-color 0.2s;
}

.user-edit-container:focus-within {
  border-color: #1677ff;
}

.user-edit-file-input {
  display: none;
}

.user-edit-images {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 8px;
}

.user-edit-img-item {
  position: relative;
}

.user-edit-img-thumb {
  width: 48px;
  height: 48px;
  object-fit: cover;
  border-radius: 6px;
  border: 1px solid #f0f0f0;
}

.user-edit-img-remove {
  position: absolute;
  top: -6px;
  right: -6px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border: 1px solid #d9d9d9;
  background: #fff;
  border-radius: 50%;
  color: #999;
  cursor: pointer;
  transition: all 0.2s;
  opacity: 0;
}

.user-edit-img-item:hover .user-edit-img-remove {
  opacity: 1;
}

.user-edit-img-remove:hover {
  color: #ff4d4f;
  border-color: #ff4d4f;
  background: #fff2f0;
}

.user-edit-textarea {
  width: 100%;
  border: none;
  outline: none;
  background: transparent;
  font-size: 14px;
  line-height: 1.6;
  color: #1a1a2e;
  resize: vertical;
  min-height: 60px;
  font-family: inherit;
}

.user-edit-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 8px;
}

.user-edit-actions-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.user-edit-tool-btn {
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

.user-edit-tool-btn:hover {
  background: #f5f5f5;
  color: #595959;
}

.user-edit-cancel-btn {
  padding: 4px 12px;
  font-size: 13px;
  border: 1px solid #d9d9d9;
  background: #fff;
  border-radius: 6px;
  color: #999;
  cursor: pointer;
  transition: all 0.2s;
}

.user-edit-cancel-btn:hover {
  color: #595959;
  border-color: #8c8c8c;
}

.user-edit-confirm-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 14px;
  font-size: 13px;
  border: none;
  background: #1677ff;
  color: #fff;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}

.user-edit-confirm-btn:hover:not(:disabled) {
  opacity: 0.85;
}

.user-edit-confirm-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
</style>
