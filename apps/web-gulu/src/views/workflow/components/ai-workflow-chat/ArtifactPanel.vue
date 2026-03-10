<script setup lang="ts">
import { computed } from 'vue';
import { Tooltip } from 'ant-design-vue';
import { createIconifyIcon } from '@vben/icons';

import AiBubbleContent from '#/components/ai-chat/AiBubbleContent.vue';
import type { ArtifactBlock } from '../shared/types';

const XIcon = createIconifyIcon('lucide:x');
const ExternalLinkIcon = createIconifyIcon('lucide:external-link');
const DownloadIcon = createIconifyIcon('lucide:download');
const GlobeIcon = createIconifyIcon('lucide:globe');
const PresentationIconSmall = createIconifyIcon('lucide:presentation');
const FileTextIconSmall = createIconifyIcon('lucide:file-text');

const props = defineProps<{
  artifact: ArtifactBlock;
}>();

const emit = defineEmits<{
  close: [];
}>();

const iframeSrc = computed(() => {
  const art = props.artifact;
  if (!art || art.streaming) return '';
  if (art.fileType === 'markdown') return '';
  if (art.url) return art.url;
  if (art.inline && art.content) {
    return `data:text/html;charset=utf-8,${encodeURIComponent(art.content)}`;
  }
  return '';
});

const typeIcon = computed(() => {
  switch (props.artifact?.fileType) {
    case 'ppt': return PresentationIconSmall;
    case 'html': return GlobeIcon;
    case 'markdown': return FileTextIconSmall;
    default: return FileTextIconSmall;
  }
});

function openInNewWindow() {
  if (iframeSrc.value) {
    window.open(iframeSrc.value, '_blank');
  }
}

async function download() {
  const art = props.artifact;
  if (!art) return;
  const rawTitle = art.title || 'report';
  const titlePart = rawTitle.length > 30 ? rawTitle.slice(0, 30) : rawTitle;

  if (art.fileType === 'markdown' && art.content) {
    const blob = new Blob([art.content], { type: 'text/markdown;charset=utf-8' });
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
  <div class="artifact-panel">
    <div class="artifact-panel-header">
      <div class="artifact-panel-type">
        <component :is="typeIcon" class="artifact-panel-type-icon" />
        <span class="artifact-panel-title">{{ artifact.title || '报告预览' }}</span>
      </div>
      <div class="artifact-panel-actions">
        <Tooltip title="在新窗口打开">
          <button class="artifact-panel-btn" @click="openInNewWindow">
            <ExternalLinkIcon class="size-4" />
          </button>
        </Tooltip>
        <Tooltip title="下载">
          <button class="artifact-panel-btn" @click="download">
            <DownloadIcon class="size-4" />
          </button>
        </Tooltip>
        <Tooltip title="关闭面板">
          <button class="artifact-panel-btn" @click="emit('close')">
            <XIcon class="size-4" />
          </button>
        </Tooltip>
      </div>
    </div>
    <div class="artifact-panel-content">
      <template v-if="artifact.streaming">
        <div class="artifact-panel-streaming">
          <AiBubbleContent
            v-if="artifact.fileType === 'markdown'"
            :content="artifact.content || ''"
            :streaming="true"
          />
          <pre v-else class="artifact-panel-code"><code>{{ artifact.content || '' }}</code></pre>
        </div>
      </template>
      <template v-else-if="iframeSrc">
        <iframe
          :src="iframeSrc"
          class="artifact-panel-iframe"
          sandbox="allow-scripts allow-same-origin allow-popups"
          frameborder="0"
        />
      </template>
      <template v-else-if="artifact.fileType === 'markdown' && artifact.content">
        <div class="artifact-panel-markdown">
          <AiBubbleContent :content="artifact.content" />
        </div>
      </template>
      <template v-else>
        <div class="artifact-panel-empty">加载中...</div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.artifact-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: hsl(var(--background));
  overflow: hidden;
}

.artifact-panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  border-bottom: 1px solid hsl(var(--border));
  background: hsl(var(--muted) / 20%);
  flex-shrink: 0;
}

.artifact-panel-type {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  flex: 1;
}

.artifact-panel-type-icon {
  width: 18px;
  height: 18px;
  color: hsl(var(--primary));
  flex-shrink: 0;
}

.artifact-panel-title {
  font-size: 14px;
  font-weight: 600;
  color: hsl(var(--foreground));
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.artifact-panel-actions {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}

.artifact-panel-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  border-radius: 6px;
  cursor: pointer;
  color: hsl(var(--muted-foreground));
  transition: all 0.2s;
}

.artifact-panel-btn:hover {
  background: hsl(var(--accent));
  color: hsl(var(--foreground));
}

.artifact-panel-content {
  flex: 1;
  overflow: hidden;
  position: relative;
}

.artifact-panel-iframe {
  width: 100%;
  height: 100%;
  border: none;
  display: block;
}

.artifact-panel-markdown {
  padding: 20px;
  height: 100%;
  overflow-y: auto;
}

.artifact-panel-streaming {
  padding: 20px;
  height: 100%;
  overflow-y: auto;
}

.artifact-panel-code {
  margin: 0;
  font-size: 12px;
  line-height: 1.5;
  color: hsl(var(--foreground));
  white-space: pre-wrap;
  word-break: break-all;
  font-family: 'Fira Code', 'Cascadia Code', 'JetBrains Mono', monospace;
}

.artifact-panel-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: hsl(var(--muted-foreground));
  font-size: 14px;
}
</style>
