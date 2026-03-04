<script setup lang="ts">
import { computed, ref } from 'vue';

import { createIconifyIcon } from '@vben/icons';

import { tryParseJSON } from './useHighlight';

const LinkIcon = createIconifyIcon('lucide:link');

const props = defineProps<{
  name: string;
  arguments: string;
  result?: string;
  isError?: boolean;
  status: 'running' | 'completed' | 'error';
}>();

const expanded = ref(false);

const parsed = computed(() => tryParseJSON(props.arguments));
const url = computed(() => parsed.value?.url || '');
const maxLength = computed(() => parsed.value?.max_length || parsed.value?.maxLength);

const PREVIEW_LEN = 500;
const resultPreview = computed(() => {
  if (!props.result) return '';
  if (props.result.length <= PREVIEW_LEN) return props.result;
  return expanded.value ? props.result : props.result.slice(0, PREVIEW_LEN);
});

const isTruncated = computed(() => {
  return (props.result?.length || 0) > PREVIEW_LEN;
});
</script>

<template>
  <div class="web-fetch-renderer">
    <div class="url-section">
      <LinkIcon class="link-icon" />
      <a class="url-link" :href="url" target="_blank" rel="noopener noreferrer">{{ url }}</a>
      <span v-if="maxLength" class="max-len">(最多 {{ maxLength }} 字符)</span>
    </div>

    <div v-if="result || status === 'completed' || status === 'error'" class="content-section">
      <div class="section-label">{{ isError ? '错误' : '抓取内容' }}</div>
      <pre class="content-body" :class="{ error: isError, empty: !result }">{{ resultPreview || '(无内容)' }}</pre>
      <button v-if="isTruncated" class="expand-btn" @click.stop="expanded = !expanded">
        {{ expanded ? '收起' : `展开全部 (${result!.length} 字符)` }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.web-fetch-renderer {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.url-section {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
}

.link-icon {
  width: 12px;
  height: 12px;
  color: hsl(var(--primary));
  flex-shrink: 0;
}

.url-link {
  font-size: 11px;
  font-family: 'SF Mono', 'Menlo', monospace;
  color: hsl(var(--primary));
  text-decoration: none;
  word-break: break-all;
}

.url-link:hover {
  text-decoration: underline;
}

.max-len {
  font-size: 10px;
  color: hsl(var(--muted-foreground));
  flex-shrink: 0;
}

.section-label {
  font-size: 11px;
  color: hsl(var(--muted-foreground));
  font-weight: 500;
  margin-bottom: 4px;
}

.content-body {
  margin: 0;
  font-size: 11px;
  line-height: 1.5;
  font-family: 'SF Mono', 'Menlo', monospace;
  white-space: pre-wrap;
  word-break: break-all;
  color: hsl(var(--foreground));
  background: hsl(var(--muted) / 20%);
  padding: 6px 8px;
  border-radius: 4px;
  max-height: 300px;
  overflow-y: auto;
}

.content-body.error {
  color: #ff4d4f;
  background: rgba(255, 77, 79, 0.08);
}

.content-body.empty {
  color: hsl(var(--muted-foreground));
  font-style: italic;
}

.expand-btn {
  display: inline-block;
  margin-top: 4px;
  padding: 2px 8px;
  font-size: 10px;
  color: hsl(var(--primary));
  background: none;
  border: 1px solid hsl(var(--border));
  border-radius: 3px;
  cursor: pointer;
}

.expand-btn:hover {
  background: hsl(var(--muted) / 30%);
}
</style>
