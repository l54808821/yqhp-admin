<script setup lang="ts">
import { ref } from 'vue';
import { Tooltip } from 'ant-design-vue';
import { Sender } from 'ant-design-x-vue';
import { createIconifyIcon } from '@vben/icons';
const PaperclipIcon = createIconifyIcon('lucide:paperclip');
const XIcon = createIconifyIcon('lucide:x');
const FileIcon = createIconifyIcon('lucide:file');
const MusicIcon = createIconifyIcon('lucide:music');
const VideoIcon = createIconifyIcon('lucide:video');

export interface ChatSenderAttachment {
  id: string;
  file?: File;
  url?: string;
  name: string;
  size: number;
  mimeType: string;
  type: 'image' | 'audio' | 'video' | 'file';
  status: 'uploading' | 'done' | 'error';
  error?: string;
}

interface Props {
  loading?: boolean;
  placeholder?: string;
  accept?: string;
  attachButtonTooltip?: string;
}

withDefaults(defineProps<Props>(), {
  loading: false,
  placeholder: '输入消息...',
  accept: undefined,
  attachButtonTooltip: '添加附件',
});

const emit = defineEmits<{
  send: [text: string, attachments: ChatSenderAttachment[]];
  'upload-files': [files: File[], callback: (results: ChatSenderAttachment[]) => void];
}>();

const inputText = ref('');
const fileInputRef = ref<HTMLInputElement | null>(null);
const pendingAttachments = ref<ChatSenderAttachment[]>([]);

function handleSend(text: string) {
  if (!text.trim() && !pendingAttachments.value.length) return;
  const attachments = [...pendingAttachments.value];
  pendingAttachments.value = [];
  inputText.value = '';
  emit('send', text, attachments);
}

function triggerFileInput() {
  fileInputRef.value?.click();
}

function handleFileInputChange(e: Event) {
  const input = e.target as HTMLInputElement;
  const files = Array.from(input.files || []);
  if (!files.length) return;
  input.value = '';
  requestUpload(files);
}

function handlePasteFile(file: File) {
  requestUpload([file]);
}

function requestUpload(files: File[]) {
  emit('upload-files', files, (results) => {
    pendingAttachments.value.push(...results);
  });
}

function removeAttachment(id: string) {
  pendingAttachments.value = pendingAttachments.value.filter((a) => a.id !== id);
}

function getAttachmentIcon(type: string) {
  switch (type) {
    case 'audio': return MusicIcon;
    case 'video': return VideoIcon;
    default: return FileIcon;
  }
}

defineExpose({ pendingAttachments });
</script>

<template>
  <div class="chat-sender">
    <input
      ref="fileInputRef"
      type="file"
      multiple
      :accept="accept"
      class="chat-sender__file-input"
      @change="handleFileInputChange"
    />

    <div class="chat-sender__card">
      <!-- 附件预览区 -->
      <div v-if="pendingAttachments.length" class="chat-sender__attachments">
        <div
          v-for="att in pendingAttachments"
          :key="att.id"
          class="chat-sender__att-item"
          :class="{ 'chat-sender__att-item--error': att.status === 'error' }"
        >
          <template v-if="att.type === 'image' && att.url">
            <img :src="att.url" :alt="att.name" class="chat-sender__att-thumb" />
          </template>
          <template v-else>
            <div class="chat-sender__att-icon">
              <component :is="getAttachmentIcon(att.type)" class="size-4" />
            </div>
          </template>
          <span v-if="att.type !== 'image'" class="chat-sender__att-name" :title="att.name">
            {{ att.name }}
          </span>
          <div v-if="att.status === 'uploading'" class="chat-sender__att-loading" />
          <button class="chat-sender__att-remove" @click="removeAttachment(att.id)">
            <XIcon class="size-3" />
          </button>
        </div>
      </div>

      <!-- Sender 输入区 -->
      <Sender
        v-model:value="inputText"
        :loading="loading"
        :placeholder="placeholder"
        @submit="handleSend"
        @paste-file="handlePasteFile"
      />

      <!-- 底部工具栏 -->
      <div class="chat-sender__toolbar">
        <div class="chat-sender__toolbar-left">
          <Tooltip :title="attachButtonTooltip">
            <button
              class="chat-sender__tool-btn"
              :disabled="loading"
              @click="triggerFileInput"
            >
              <PaperclipIcon class="size-4" />
            </button>
          </Tooltip>
          <slot name="toolbar-left" />
        </div>
        <div class="chat-sender__toolbar-right">
          <slot name="toolbar-right" />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.chat-sender__file-input {
  display: none;
}

.chat-sender__card {
  padding: 8px 12px;
  background: hsl(var(--background));
  border: 1px solid hsl(var(--border));
  border-radius: 24px;
  transition: box-shadow 0.3s, border-color 0.3s;
}

.chat-sender__card:focus-within {
  border-color: hsl(var(--foreground) / 30%);
}

.chat-sender__card :deep(.ant-sender) {
  border: none !important;
  box-shadow: none !important;
  background: transparent !important;
}

.chat-sender__card :deep(.ant-sender-content) {
  border: none !important;
}

.chat-sender__card :deep(.ant-input),
.chat-sender__card :deep(textarea) {
  border: none !important;
  box-shadow: none !important;
  background: transparent !important;
  padding: 4px 0 !important;
  resize: none;
  font-size: 15px;
}

.chat-sender__card :deep(.ant-input:focus),
.chat-sender__card :deep(textarea:focus) {
  box-shadow: none !important;
}

/* 附件预览 */
.chat-sender__attachments {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 8px 4px 4px;
}

.chat-sender__att-item {
  position: relative;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  background: hsl(var(--accent));
  border: 1px solid hsl(var(--border));
  border-radius: 8px;
  max-width: 160px;
  transition: border-color 0.2s;
}

.chat-sender__att-item--error {
  border-color: #ff4d4f;
  background: #fff2f0;
}

.chat-sender__att-thumb {
  width: 40px;
  height: 40px;
  object-fit: cover;
  border-radius: 6px;
}

.chat-sender__att-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 6px;
  background: hsl(var(--background));
  color: hsl(var(--muted-foreground));
  flex-shrink: 0;
}

.chat-sender__att-name {
  font-size: 12px;
  color: hsl(var(--foreground));
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 80px;
}

.chat-sender__att-loading {
  width: 14px;
  height: 14px;
  border: 2px solid hsl(var(--border));
  border-top-color: var(--ant-color-primary, #1677ff);
  border-radius: 50%;
  animation: chat-sender-spin 0.8s linear infinite;
}

@keyframes chat-sender-spin {
  to { transform: rotate(360deg); }
}

.chat-sender__att-remove {
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

.chat-sender__att-item:hover .chat-sender__att-remove {
  opacity: 1;
}

.chat-sender__att-remove:hover {
  color: #ff4d4f;
  border-color: #ff4d4f;
  background: #fff2f0;
}

/* 工具栏 */
.chat-sender__toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 4px;
}

.chat-sender__toolbar-left {
  display: flex;
  gap: 4px;
  align-items: center;
}

.chat-sender__toolbar-right {
  display: flex;
  gap: 4px;
  align-items: center;
}

.chat-sender__tool-btn {
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

.chat-sender__tool-btn:hover:not(:disabled) {
  background: hsl(var(--accent));
  color: hsl(var(--foreground));
}

.chat-sender__tool-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
</style>
