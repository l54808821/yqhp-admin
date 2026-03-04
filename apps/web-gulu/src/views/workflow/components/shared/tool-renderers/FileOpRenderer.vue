<script setup lang="ts">
import { computed, ref } from 'vue';

import { createIconifyIcon } from '@vben/icons';

import {
  guessLanguageFromPath,
  highlightCode,
  tryParseJSON,
} from './useHighlight';

const FileIcon = createIconifyIcon('lucide:file');
const FileEditIcon = createIconifyIcon('lucide:file-edit');
const FilePlusIcon = createIconifyIcon('lucide:file-plus');
const FolderIcon = createIconifyIcon('lucide:folder');
const ChevronDown = createIconifyIcon('lucide:chevron-down');
const ChevronRight = createIconifyIcon('lucide:chevron-right');

const props = defineProps<{
  name: string;
  arguments: string;
  result?: string;
  isError?: boolean;
  status: 'running' | 'completed' | 'error';
}>();

const showRawArgs = ref(false);

const parsed = computed(() => tryParseJSON(props.arguments));
const filePath = computed(() => parsed.value?.path || '');

const toolIcon = computed(() => {
  switch (props.name) {
    case 'edit_file': return FileEditIcon;
    case 'write_file':
    case 'append_file': return FilePlusIcon;
    case 'list_dir': return FolderIcon;
    default: return FileIcon;
  }
});

const toolLabel = computed(() => {
  const labels: Record<string, string> = {
    read_file: '读取文件',
    write_file: '写入文件',
    edit_file: '编辑文件',
    append_file: '追加内容',
    list_dir: '列出目录',
  };
  return labels[props.name] || props.name;
});

const fileName = computed(() => {
  if (!filePath.value) return '';
  const parts = filePath.value.split('/');
  return parts[parts.length - 1] || filePath.value;
});

const lang = computed(() => guessLanguageFromPath(filePath.value));

const oldText = computed(() => parsed.value?.old_text || parsed.value?.oldText || '');
const newText = computed(() => parsed.value?.new_text || parsed.value?.newText || '');
const content = computed(() => parsed.value?.content || '');

const highlightedContent = computed(() => {
  if (!content.value) return '';
  return highlightCode(content.value, lang.value);
});

const highlightedResult = computed(() => {
  if (!props.result) return '';
  if (props.name === 'list_dir') return '';
  return highlightCode(props.result, lang.value);
});

const isEditTool = computed(() => props.name === 'edit_file');
const isListDir = computed(() => props.name === 'list_dir');
const isWriteTool = computed(() => props.name === 'write_file' || props.name === 'append_file');

const startLine = computed(() => parsed.value?.start_line || parsed.value?.startLine);
const numLines = computed(() => parsed.value?.num_lines || parsed.value?.numLines);
const recursive = computed(() => parsed.value?.recursive);

const dirEntries = computed(() => {
  if (!isListDir.value || !props.result) return [];
  return props.result.split('\n').filter((l) => l.trim());
});
</script>

<template>
  <div class="file-op-renderer">
    <div class="file-header">
      <component :is="toolIcon" class="file-icon" />
      <span class="tool-label">{{ toolLabel }}</span>
      <span v-if="filePath" class="file-path" :title="filePath">{{ fileName }}</span>
      <span v-if="startLine" class="meta-badge">L{{ startLine }}<span v-if="numLines">-{{ startLine + numLines - 1 }}</span></span>
      <span v-if="recursive" class="meta-badge">递归</span>
      <button class="raw-toggle" @click.stop="showRawArgs = !showRawArgs">
        <component :is="showRawArgs ? ChevronDown : ChevronRight" class="raw-toggle-icon" />
        <span>原始参数</span>
      </button>
    </div>

    <pre v-if="showRawArgs" class="raw-args">{{ $props.arguments }}</pre>

    <!-- edit_file: diff 风格 -->
    <div v-if="isEditTool && (oldText || newText)" class="diff-section">
      <div class="diff-block diff-old">
        <div class="diff-label">- 原文</div>
        <pre class="diff-content">{{ oldText }}</pre>
      </div>
      <div class="diff-block diff-new">
        <div class="diff-label">+ 新文</div>
        <pre class="diff-content">{{ newText }}</pre>
      </div>
    </div>

    <!-- write_file / append_file: 写入内容 -->
    <div v-if="isWriteTool && content" class="write-section">
      <pre class="code-body"><code class="hljs" v-html="highlightedContent" /></pre>
    </div>

    <!-- 结果 -->
    <div v-if="result || status === 'completed' || status === 'error'" class="result-section">
      <div class="section-label">{{ isError ? '错误' : '结果' }}</div>

      <!-- list_dir: 文件树 -->
      <div v-if="isListDir && dirEntries.length > 0" class="dir-list">
        <div v-for="(entry, i) in dirEntries" :key="i" class="dir-entry">
          <component :is="entry.endsWith('/') ? FolderIcon : FileIcon" class="entry-icon" />
          <span>{{ entry }}</span>
        </div>
      </div>

      <!-- read_file: 代码高亮 -->
      <pre v-else-if="highlightedResult && !isError" class="code-body"><code class="hljs" v-html="highlightedResult" /></pre>

      <pre v-else class="plain-result" :class="{ error: isError, empty: !result }">{{ result || '(无输出)' }}</pre>
    </div>
  </div>
</template>

<style scoped>
.file-op-renderer {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.file-header {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  flex-wrap: wrap;
}

.file-icon {
  width: 13px;
  height: 13px;
  color: hsl(var(--primary));
  flex-shrink: 0;
}

.tool-label {
  font-weight: 600;
  color: hsl(var(--foreground));
  font-size: 11px;
  flex-shrink: 0;
}

.file-path {
  font-family: 'SF Mono', 'Menlo', monospace;
  color: hsl(var(--foreground) / 80%);
  font-size: 11px;
  word-break: break-all;
}

.meta-badge {
  font-size: 9px;
  color: hsl(var(--muted-foreground));
  background: hsl(var(--muted) / 40%);
  padding: 0 4px;
  border-radius: 3px;
  flex-shrink: 0;
}

.raw-toggle {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 2px;
  background: none;
  border: none;
  color: hsl(var(--muted-foreground));
  cursor: pointer;
  font-size: 10px;
  padding: 1px 4px;
  border-radius: 3px;
}

.raw-toggle:hover {
  background: hsl(var(--muted) / 50%);
  color: hsl(var(--foreground));
}

.raw-toggle-icon {
  width: 10px;
  height: 10px;
}

.raw-args {
  margin: 0;
  padding: 6px 10px;
  font-size: 10px;
  line-height: 1.4;
  font-family: 'SF Mono', 'Menlo', monospace;
  background: hsl(var(--muted) / 20%);
  color: hsl(var(--muted-foreground));
  border: 1px solid hsl(var(--border));
  border-radius: 4px;
  white-space: pre-wrap;
  word-break: break-all;
  max-height: 120px;
  overflow-y: auto;
}

.diff-section {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.diff-block {
  border-radius: 4px;
  overflow: hidden;
}

.diff-label {
  font-size: 10px;
  font-weight: 600;
  padding: 2px 8px;
}

.diff-old .diff-label {
  background: rgba(255, 77, 79, 0.1);
  color: #ff4d4f;
}

.diff-new .diff-label {
  background: rgba(82, 196, 26, 0.1);
  color: #52c41a;
}

.diff-content {
  margin: 0;
  padding: 6px 8px;
  font-size: 11px;
  line-height: 1.5;
  font-family: 'SF Mono', 'Menlo', monospace;
  white-space: pre-wrap;
  word-break: break-all;
  max-height: 150px;
  overflow-y: auto;
}

.diff-old .diff-content {
  background: rgba(255, 77, 79, 0.04);
  color: hsl(var(--foreground) / 80%);
}

.diff-new .diff-content {
  background: rgba(82, 196, 26, 0.04);
  color: hsl(var(--foreground));
}

.write-section {
  border-radius: 4px;
  overflow: hidden;
  border: 1px solid hsl(var(--border));
}

.code-body {
  margin: 0;
  padding: 8px 10px;
  font-size: 11px;
  line-height: 1.6;
  font-family: 'SF Mono', 'Menlo', 'Consolas', monospace;
  background: #1e1e2e;
  color: #cdd6f4;
  overflow-x: auto;
  max-height: 240px;
  overflow-y: auto;
  border-radius: 4px;
}

.code-body code {
  font-family: inherit;
  font-size: inherit;
}

.result-section {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.section-label {
  font-size: 11px;
  color: hsl(var(--muted-foreground));
  font-weight: 500;
}

.dir-list {
  display: flex;
  flex-direction: column;
  gap: 1px;
  padding: 4px 0;
  max-height: 200px;
  overflow-y: auto;
}

.dir-entry {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  font-family: 'SF Mono', 'Menlo', monospace;
  color: hsl(var(--foreground));
  padding: 1px 4px;
  border-radius: 2px;
}

.dir-entry:hover {
  background: hsl(var(--muted) / 20%);
}

.entry-icon {
  width: 12px;
  height: 12px;
  color: hsl(var(--muted-foreground));
  flex-shrink: 0;
}

.plain-result {
  margin: 0;
  font-size: 11px;
  line-height: 1.5;
  font-family: 'SF Mono', 'Menlo', monospace;
  white-space: pre-wrap;
  word-break: break-all;
  color: hsl(var(--foreground));
  background: hsl(var(--muted) / 30%);
  padding: 6px 8px;
  border-radius: 4px;
  max-height: 200px;
  overflow-y: auto;
}

.plain-result.error {
  color: #ff4d4f;
}

.plain-result.empty {
  color: hsl(var(--muted-foreground));
  font-style: italic;
}
</style>
