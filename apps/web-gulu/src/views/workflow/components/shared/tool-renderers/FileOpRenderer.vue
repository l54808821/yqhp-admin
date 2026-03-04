<script setup lang="ts">
import { computed } from 'vue';

import { createIconifyIcon } from '@vben/icons';

import {
  guessLanguageFromPath,
  highlightCode,
  tryParseJSON,
} from './useHighlight';

const FileIcon = createIconifyIcon('lucide:file');
const FolderIcon = createIconifyIcon('lucide:folder');

const props = defineProps<{
  name: string;
  arguments: string;
  result?: string;
  isError?: boolean;
  status: 'running' | 'completed' | 'error';
}>();

const parsed = computed(() => tryParseJSON(props.arguments));
const filePath = computed(() => parsed.value?.path || '');
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

const dirEntries = computed(() => {
  if (!isListDir.value || !props.result) return [];
  return props.result.split('\n').filter((l) => l.trim());
});
</script>

<template>
  <div class="file-op-renderer">
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

    <div v-else-if="!isEditTool && !isWriteTool" class="waiting">
      <span class="waiting-text">执行中...</span>
    </div>
  </div>
</template>

<style scoped>
.file-op-renderer {
  display: flex;
  flex-direction: column;
  gap: 6px;
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

.waiting {
  padding: 4px 0;
}

.waiting-text {
  font-size: 11px;
  color: hsl(var(--muted-foreground));
  font-style: italic;
}
</style>
