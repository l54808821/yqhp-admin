<script setup lang="ts">
import { computed, ref } from 'vue';

const props = defineProps<{
  name: string;
  arguments: string;
  result?: string;
  isError?: boolean;
  status: 'running' | 'completed' | 'error';
}>();

const contentExpanded = ref(false);

const PREVIEW_LEN = 500;
const resultPreview = computed(() => {
  if (!props.result) return '';
  if (props.result.length <= PREVIEW_LEN) return props.result;
  return contentExpanded.value ? props.result : props.result.slice(0, PREVIEW_LEN);
});

const isTruncated = computed(() => {
  return (props.result?.length || 0) > PREVIEW_LEN;
});
</script>

<template>
  <div class="web-fetch-renderer">
    <div v-if="result || status === 'completed' || status === 'error'" class="content-section">
      <pre class="content-body" :class="{ error: isError, empty: !result }">{{ resultPreview || '(无内容)' }}</pre>
      <button v-if="isTruncated" class="expand-btn" @click.stop="contentExpanded = !contentExpanded">
        {{ contentExpanded ? '收起' : `展开全部 (${result!.length} 字符)` }}
      </button>
    </div>
    <div v-else class="waiting">
      <span class="waiting-text">抓取中...</span>
    </div>
  </div>
</template>

<style scoped>
.web-fetch-renderer {
  display: flex;
  flex-direction: column;
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

.waiting {
  padding: 4px 0;
}

.waiting-text {
  font-size: 11px;
  color: hsl(var(--muted-foreground));
  font-style: italic;
}
</style>
