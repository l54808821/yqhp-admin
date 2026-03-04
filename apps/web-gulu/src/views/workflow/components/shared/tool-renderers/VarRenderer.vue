<script setup lang="ts">
import { computed } from 'vue';

import { createIconifyIcon } from '@vben/icons';

import { formatJSON, tryParseJSON } from './useHighlight';

const VarIcon = createIconifyIcon('lucide:variable');
const PenIcon = createIconifyIcon('lucide:pen-line');

const props = defineProps<{
  name: string;
  arguments: string;
  result?: string;
  isError?: boolean;
  status: 'running' | 'completed' | 'error';
}>();

const parsed = computed(() => tryParseJSON(props.arguments));
const varName = computed(() => parsed.value?.name || '');
const varValue = computed(() => {
  if (parsed.value?.value === undefined) return null;
  const v = parsed.value.value;
  if (typeof v === 'object') return JSON.stringify(v, null, 2);
  return String(v);
});

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
    <div class="var-header">
      <component :is="isWrite ? PenIcon : VarIcon" class="var-icon" />
      <span class="action-label">{{ isWrite ? '写入变量' : '读取变量' }}</span>
      <code class="var-name">{{ varName }}</code>
    </div>

    <div v-if="isWrite && varValue !== null" class="write-value">
      <div class="section-label">写入值</div>
      <pre class="value-content">{{ varValue }}</pre>
    </div>

    <div v-if="result || status === 'completed' || status === 'error'" class="result-section">
      <div class="section-label">{{ isError ? '错误' : (isWrite ? '结果' : '变量值') }}</div>
      <pre class="value-content" :class="{ error: isError, empty: !result }">{{ formattedResult || '(无值)' }}</pre>
    </div>
  </div>
</template>

<style scoped>
.var-renderer {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.var-header {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
}

.var-icon {
  width: 13px;
  height: 13px;
  color: hsl(var(--primary));
  flex-shrink: 0;
}

.action-label {
  font-size: 11px;
  font-weight: 600;
  color: hsl(var(--foreground));
  flex-shrink: 0;
}

.var-name {
  font-size: 12px;
  font-family: 'SF Mono', 'Menlo', monospace;
  color: hsl(var(--primary));
  background: hsl(var(--primary) / 10%);
  padding: 0 6px;
  border-radius: 3px;
  font-weight: 500;
}

.section-label {
  font-size: 11px;
  color: hsl(var(--muted-foreground));
  font-weight: 500;
  margin-bottom: 2px;
}

.write-value {
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
</style>
