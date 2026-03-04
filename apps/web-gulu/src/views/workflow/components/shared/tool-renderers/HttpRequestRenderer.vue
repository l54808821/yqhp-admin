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

const resultParsed = computed(() => {
  if (!props.result) return null;
  return tryParseJSON(props.result);
});

const formattedResult = computed(() => {
  if (!props.result) return '';
  if (resultParsed.value !== null) return formatJSON(props.result);
  return props.result;
});

const highlightedResult = computed(() => {
  if (!formattedResult.value) return '';
  if (resultParsed.value !== null) return highlightCode(formattedResult.value, 'json');
  return '';
});

const statusCode = computed(() => {
  if (!resultParsed.value) return null;
  return resultParsed.value.status_code || resultParsed.value.statusCode || null;
});

const statusCodeClass = computed(() => {
  const code = statusCode.value;
  if (!code) return '';
  if (code >= 200 && code < 300) return 'status-2xx';
  if (code >= 300 && code < 400) return 'status-3xx';
  if (code >= 400 && code < 500) return 'status-4xx';
  return 'status-5xx';
});
</script>

<template>
  <div class="http-request-renderer">
    <div v-if="result || status === 'completed' || status === 'error'" class="response-section">
      <div class="response-header">
        <span class="section-label">{{ isError ? '错误' : '响应' }}</span>
        <span v-if="statusCode" class="status-badge" :class="statusCodeClass">{{ statusCode }}</span>
      </div>
      <pre v-if="highlightedResult && !isError" class="response-body"><code class="hljs" v-html="highlightedResult" /></pre>
      <pre v-else class="response-body" :class="{ error: isError, empty: !result }">{{ result || '(无输出)' }}</pre>
    </div>
    <div v-else class="waiting">
      <span class="waiting-text">请求中...</span>
    </div>
  </div>
</template>

<style scoped>
.http-request-renderer {
  display: flex;
  flex-direction: column;
}

.response-section {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.response-header {
  display: flex;
  align-items: center;
  gap: 6px;
}

.section-label {
  font-size: 11px;
  color: hsl(var(--muted-foreground));
  font-weight: 500;
}

.status-badge {
  font-size: 10px;
  font-weight: 700;
  padding: 0 5px;
  border-radius: 3px;
}

.status-2xx { background: rgba(82, 196, 26, 0.15); color: #52c41a; }
.status-3xx { background: rgba(24, 144, 255, 0.15); color: #1890ff; }
.status-4xx { background: rgba(250, 173, 20, 0.15); color: #faad14; }
.status-5xx { background: rgba(255, 77, 79, 0.15); color: #ff4d4f; }

.response-body {
  margin: 0;
  padding: 6px 10px;
  font-size: 11px;
  line-height: 1.5;
  font-family: 'SF Mono', 'Menlo', monospace;
  background: #1e1e2e;
  color: #cdd6f4;
  border-radius: 4px;
  white-space: pre-wrap;
  word-break: break-all;
  max-height: 200px;
  overflow-y: auto;
}

.response-body code {
  font-family: inherit;
  font-size: inherit;
}

.response-body.error {
  color: #ff4d4f;
  background: rgba(255, 77, 79, 0.08);
}

.response-body.empty {
  color: hsl(var(--muted-foreground));
  font-style: italic;
  background: hsl(var(--muted) / 20%);
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
