<script setup lang="ts">
import { computed } from 'vue';

import { createIconifyIcon } from '@vben/icons';

import { highlightCode, tryParseJSON } from './useHighlight';

const CodeIcon = createIconifyIcon('lucide:code-xml');

const props = defineProps<{
  name: string;
  arguments: string;
}>();

const parsed = computed(() => tryParseJSON(props.arguments));
const code = computed(() => parsed.value?.code || '');
const language = computed(() => parsed.value?.language || 'python');

const highlightedCode = computed(() => {
  if (!code.value) return '';
  return highlightCode(code.value, language.value);
});

const langLabel = computed(() => {
  const map: Record<string, string> = { python: 'Python', javascript: 'JavaScript' };
  return map[language.value] || language.value;
});
</script>

<template>
  <div class="code-params">
    <div class="code-params-header">
      <CodeIcon class="lang-icon" />
      <span class="lang-label">{{ langLabel }}</span>
    </div>
    <pre v-if="highlightedCode" class="code-body"><code class="hljs" v-html="highlightedCode" /></pre>
    <pre v-else class="code-body-plain">{{ code || $props.arguments }}</pre>
  </div>
</template>

<style scoped>
.code-params {
  min-width: 280px;
  max-width: 480px;
  border-radius: 4px;
  overflow: hidden;
}

.code-params-header {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 4px 8px;
  background: hsl(var(--muted) / 30%);
  border-bottom: 1px solid hsl(var(--border));
}

.lang-icon {
  width: 12px;
  height: 12px;
  color: hsl(var(--muted-foreground));
}

.lang-label {
  font-size: 11px;
  font-weight: 600;
  color: hsl(var(--foreground));
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
  max-height: 300px;
  overflow-y: auto;
}

.code-body code {
  font-family: inherit;
  font-size: inherit;
}

.code-body-plain {
  margin: 0;
  padding: 8px 10px;
  font-size: 11px;
  line-height: 1.5;
  font-family: 'SF Mono', 'Menlo', monospace;
  white-space: pre-wrap;
  word-break: break-all;
  color: hsl(var(--foreground));
  max-height: 300px;
  overflow-y: auto;
}
</style>
