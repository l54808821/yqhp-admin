<script setup lang="ts">
import { computed, ref } from 'vue';

import { createIconifyIcon } from '@vben/icons';
import type { ArtifactBlock } from '../types';
import { AiBubbleContent } from '#/components/ai-chat';

const ExternalLinkIcon = createIconifyIcon('lucide:external-link');
const DownloadIcon = createIconifyIcon('lucide:download');
const PanelRightIcon = createIconifyIcon('lucide:panel-right');
const ChevronDownIcon = createIconifyIcon('lucide:chevron-down');
const ChevronUpIcon = createIconifyIcon('lucide:chevron-up');
const FileTextIcon = createIconifyIcon('lucide:file-text');
const PresentationIcon = createIconifyIcon('lucide:presentation');
const GlobeIcon = createIconifyIcon('lucide:globe');
const LoaderIcon = createIconifyIcon('lucide:loader-2');

const props = defineProps<{
  block: ArtifactBlock;
}>();

const emit = defineEmits<{
  (e: 'artifact-open', block: ArtifactBlock): void;
}>();

const expanded = ref(true);

const typeConfig = computed(() => {
  switch (props.block.fileType) {
    case 'ppt':
      return { icon: PresentationIcon, label: 'PPT 演示', color: '#FF860D' };
    case 'html':
      return { icon: GlobeIcon, label: '网页报告', color: '#29CC29' };
    case 'markdown':
      return { icon: FileTextIcon, label: 'Markdown 文档', color: '#4040FF' };
    default:
      return { icon: FileTextIcon, label: '报告', color: '#666' };
  }
});

const iframeSrc = computed(() => {
  if (props.block.streaming) return '';
  if (props.block.fileType === 'markdown') return '';
  if (props.block.url) return props.block.url;
  if (props.block.inline && props.block.content) {
    return `data:text/html;charset=utf-8,${encodeURIComponent(props.block.content)}`;
  }
  return '';
});

const isIframeType = computed(() => {
  return props.block.fileType === 'html' || props.block.fileType === 'ppt';
});

const isReady = computed(() => {
  return !props.block.streaming;
});

const streamingCharCount = computed(() => {
  return props.block.content?.length || 0;
});

function openInNewWindow() {
  if (iframeSrc.value) {
    window.open(iframeSrc.value, '_blank');
  }
}

function openInPanel() {
  emit('artifact-open', props.block);
}

async function downloadReport() {
  const rawTitle = props.block.title || 'report';
  const titlePart = rawTitle.length > 30 ? rawTitle.slice(0, 30) : rawTitle;

  if (props.block.fileType === 'markdown' && props.block.content) {
    const blob = new Blob([props.block.content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${titlePart}.md`;
    a.click();
    URL.revokeObjectURL(url);
    return;
  }

  const src = iframeSrc.value;
  if (!src) return;

  const fileName = `${titlePart}.html`;

  if (src.startsWith('data:')) {
    const a = document.createElement('a');
    a.href = src;
    a.download = fileName;
    a.click();
    return;
  }

  try {
    const resp = await fetch(src);
    const blob = await resp.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  } catch {
    window.open(src, '_blank');
  }
}
</script>

<template>
  <div class="artifact-block" :class="{ 'artifact-block--streaming': block.streaming }">
    <div class="artifact-header" @click="expanded = !expanded">
      <div class="artifact-type">
        <component :is="block.streaming ? LoaderIcon : typeConfig.icon" class="type-icon" :class="{ 'type-icon--spinning': block.streaming }" :style="{ color: block.streaming ? undefined : typeConfig.color }" />
        <span class="type-label">{{ typeConfig.label }}</span>
      </div>
      <span v-if="block.title" class="artifact-title">{{ block.title }}</span>
      <div v-if="block.streaming" class="artifact-streaming-badge">
        <span class="streaming-dot" />
        生成中... {{ streamingCharCount }} 字
      </div>
      <div class="artifact-actions">
        <button v-if="isReady" class="action-btn" title="在侧边面板打开" @click.stop="openInPanel">
          <PanelRightIcon class="action-icon" />
        </button>
        <button v-if="isReady && isIframeType && iframeSrc" class="action-btn" title="在新窗口打开" @click.stop="openInNewWindow">
          <ExternalLinkIcon class="action-icon" />
        </button>
        <button v-if="isReady && (iframeSrc || block.fileType === 'markdown')" class="action-btn" title="下载" @click.stop="downloadReport">
          <DownloadIcon class="action-icon" />
        </button>
        <button class="action-btn" :title="expanded ? '收起' : '展开'" @click.stop="expanded = !expanded">
          <component :is="expanded ? ChevronUpIcon : ChevronDownIcon" class="action-icon" />
        </button>
      </div>
    </div>

    <div v-if="expanded" class="artifact-content">
      <!-- 流式生成中：显示 Markdown/代码内容 -->
      <template v-if="block.streaming">
        <div class="artifact-streaming-content">
          <AiBubbleContent
            v-if="block.fileType === 'markdown'"
            :content="block.content || ''"
            :streaming="true"
          />
          <pre v-else class="artifact-code-preview"><code>{{ block.content || '' }}</code></pre>
        </div>
      </template>

      <!-- 生成完成：iframe 渲染 -->
      <template v-else-if="isIframeType && iframeSrc">
        <iframe
          :src="iframeSrc"
          class="artifact-iframe"
          sandbox="allow-scripts allow-same-origin allow-popups"
          frameborder="0"
        />
      </template>

      <!-- Markdown 完成态 -->
      <template v-else-if="block.fileType === 'markdown' && block.content">
        <div class="artifact-markdown">
          <AiBubbleContent :content="block.content" />
        </div>
      </template>

      <template v-else>
        <div class="artifact-empty">报告内容加载中...</div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.artifact-block {
  border: 1px solid hsl(var(--border));
  border-radius: 10px;
  overflow: hidden;
  background: hsl(var(--card));
}

.artifact-block--streaming {
  border-color: hsl(var(--primary) / 40%);
}

.artifact-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  background: hsl(var(--muted) / 30%);
  border-bottom: 1px solid hsl(var(--border));
  cursor: pointer;
  user-select: none;
  transition: background 0.2s;
}

.artifact-header:hover {
  background: hsl(var(--muted) / 50%);
}

.artifact-type {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.type-icon {
  width: 16px;
  height: 16px;
}

.type-icon--spinning {
  animation: spin 1.5s linear infinite;
  color: hsl(var(--primary));
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.type-label {
  font-size: 12px;
  font-weight: 600;
  color: hsl(var(--muted-foreground));
  white-space: nowrap;
}

.artifact-title {
  flex: 1;
  font-size: 13px;
  font-weight: 500;
  color: hsl(var(--foreground));
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.artifact-streaming-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  color: hsl(var(--primary));
  flex-shrink: 0;
}

.streaming-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: hsl(var(--primary));
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}

.artifact-actions {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}

.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  background: transparent;
  border-radius: 6px;
  cursor: pointer;
  color: hsl(var(--muted-foreground));
  transition: all 0.2s;
}

.action-btn:hover {
  background: hsl(var(--muted) / 60%);
  color: hsl(var(--foreground));
}

.action-icon {
  width: 14px;
  height: 14px;
}

.artifact-content {
  position: relative;
}

.artifact-iframe {
  width: 100%;
  height: 500px;
  border: none;
  display: block;
}

.artifact-markdown {
  padding: 16px;
  max-height: 600px;
  overflow-y: auto;
}

.artifact-streaming-content {
  padding: 16px;
  max-height: 400px;
  overflow-y: auto;
}

.artifact-code-preview {
  margin: 0;
  font-size: 12px;
  line-height: 1.5;
  color: hsl(var(--foreground));
  white-space: pre-wrap;
  word-break: break-all;
  font-family: 'Fira Code', 'Cascadia Code', 'JetBrains Mono', monospace;
}

.artifact-empty {
  padding: 40px;
  text-align: center;
  color: hsl(var(--muted-foreground));
  font-size: 13px;
}
</style>
