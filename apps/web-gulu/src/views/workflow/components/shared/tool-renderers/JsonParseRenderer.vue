<script setup lang="ts">
import { computed } from 'vue';

import { formatJSON, highlightCode, tryParseJSON } from './useHighlight';

const props = defineProps<{
  name: string;
  arguments: string;
  result?: string;
  isError?: boolean;
  status: 'running' | 'completed' | 'error';
}>();

const formattedResult = computed(() => {
  if (!props.result) return '';
  return formatJSON(props.result);
});

const highlightedResult = computed(() => {
  if (!formattedResult.value) return '';
  const p = tryParseJSON(props.result || '');
  if (p !== null) return highlightCode(formattedResult.value, 'json');
  return '';
});
</script>

<template>
  <div class="json-parse-renderer">
    <div v-if="result || status === 'completed' || status === 'error'" class="result-section">
      <pre v-if="highlightedResult && !isError" class="json-body"><code class="hljs" v-html="highlightedResult" /></pre>
      <pre v-else class="plain-body" :class="{ error: isError, empty: !result }">{{ formattedResult || '(无结果)' }}</pre>
    </div>
    <div v-else class="waiting">
      <span class="waiting-text">解析中...</span>
    </div>
  </div>
</template>

<style scoped>
.json-parse-renderer {
  display: flex;
  flex-direction: column;
}

.json-body {
  margin: 0;
  padding: 8px 10px;
  font-size: 11px;
  line-height: 1.5;
  font-family: 'SF Mono', 'Menlo', 'Consolas', monospace;
  background: #1e1e2e;
  color: #cdd6f4;
  border-radius: 4px;
  overflow-x: auto;
  max-height: 200px;
  overflow-y: auto;
}

.json-body code {
  font-family: inherit;
  font-size: inherit;
}

.plain-body {
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

.plain-body.error {
  color: #ff4d4f;
}

.plain-body.empty {
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
