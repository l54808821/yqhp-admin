<script setup lang="ts">
import { computed } from 'vue';

import { formatJSON, tryParseJSON } from './useHighlight';

const props = defineProps<{
  name: string;
  arguments: string;
  result?: string;
  isError?: boolean;
  status: 'running' | 'completed' | 'error';
}>();

const isWrite = computed(() => props.name === 'var_write');

const formattedResult = computed(() => {
  if (!props.result) return '';
  const p = tryParseJSON(props.result);
  if (p !== null) return formatJSON(props.result);
  return props.result;
});
</script>

<template>
  <div class="var-renderer">
    <div v-if="result || status === 'completed' || status === 'error'" class="result-section">
      <pre class="value-content" :class="{ error: isError, empty: !result }">{{ formattedResult || '(无值)' }}</pre>
    </div>
    <div v-else class="waiting">
      <span class="waiting-text">{{ isWrite ? '写入中...' : '读取中...' }}</span>
    </div>
  </div>
</template>

<style scoped>
.var-renderer {
  display: flex;
  flex-direction: column;
}

.value-content {
  margin: 0;
  font-size: 11px;
  line-height: 1.5;
  font-family: 'SF Mono', 'Menlo', monospace;
  white-space: pre-wrap;
  word-break: break-all;
  color: hsl(var(--foreground));
  background: hsl(var(--muted) / 25%);
  padding: 6px 8px;
  border-radius: 4px;
  max-height: 160px;
  overflow-y: auto;
}

.value-content.error {
  color: #ff4d4f;
}

.value-content.empty {
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
