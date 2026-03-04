<script setup lang="ts">
import { computed } from 'vue';

import { createIconifyIcon } from '@vben/icons';

import { formatJSON, highlightCode, tryParseJSON } from './useHighlight';

const BracesIcon = createIconifyIcon('lucide:braces');

const props = defineProps<{
  name: string;
  arguments: string;
  result?: string;
  isError?: boolean;
  status: 'running' | 'completed' | 'error';
}>();

const parsed = computed(() => tryParseJSON(props.arguments));
const jsonString = computed(() => parsed.value?.json_string || parsed.value?.jsonString || '');
const pathExpr = computed(() => parsed.value?.path || '');

const formattedInput = computed(() => formatJSON(jsonString.value));
const highlightedInput = computed(() => {
  if (!formattedInput.value) return '';
  return highlightCode(formattedInput.value, 'json');
});

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
    <div class="header-line">
      <BracesIcon class="header-icon" />
      <span class="header-label">JSON 解析</span>
      <code v-if="pathExpr" class="path-expr">$.{{ pathExpr }}</code>
    </div>

    <div v-if="jsonString" class="input-section">
      <div class="section-label">输入 JSON</div>
      <pre v-if="highlightedInput" class="json-body"><code class="hljs" v-html="highlightedInput" /></pre>
      <pre v-else class="plain-body">{{ jsonString }}</pre>
    </div>

    <div v-if="result || status === 'completed' || status === 'error'" class="result-section">
      <div class="section-label">{{ isError ? '错误' : '解析结果' }}</div>
      <pre v-if="highlightedResult && !isError" class="json-body"><code class="hljs" v-html="highlightedResult" /></pre>
      <pre v-else class="plain-body" :class="{ error: isError, empty: !result }">{{ formattedResult || '(无结果)' }}</pre>
    </div>
  </div>
</template>

<style scoped>
.json-parse-renderer {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.header-line {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
}

.header-icon {
  width: 13px;
  height: 13px;
  color: hsl(var(--primary));
  flex-shrink: 0;
}

.header-label {
  font-weight: 600;
  font-size: 11px;
  color: hsl(var(--foreground));
}

.path-expr {
  font-size: 11px;
  font-family: 'SF Mono', 'Menlo', monospace;
  color: hsl(var(--primary));
  background: hsl(var(--primary) / 10%);
  padding: 0 5px;
  border-radius: 3px;
}

.section-label {
  font-size: 11px;
  color: hsl(var(--muted-foreground));
  font-weight: 500;
  margin-bottom: 4px;
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
</style>
