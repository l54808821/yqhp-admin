<script setup lang="ts">
import { computed, ref } from 'vue';

import { createIconifyIcon } from '@vben/icons';

import { highlightCode, tryParseJSON } from './useHighlight';

const CodeIcon = createIconifyIcon('lucide:code-2');
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
const code = computed(() => parsed.value?.code || '');
const language = computed(() => parsed.value?.language || 'python');

const highlightedCode = computed(() => {
  if (!code.value) return '';
  return highlightCode(code.value, language.value);
});

const langLabel = computed(() => {
  const map: Record<string, string> = {
    python: 'Python',
    javascript: 'JavaScript',
  };
  return map[language.value] || language.value;
});
</script>

<template>
  <div class="code-execute-renderer">
    <div v-if="code" class="code-section">
      <div class="code-header">
        <CodeIcon class="code-header-icon" />
        <span class="lang-label">{{ langLabel }}</span>
        <button class="raw-toggle" @click.stop="showRawArgs = !showRawArgs">
          <component :is="showRawArgs ? ChevronDown : ChevronRight" class="raw-toggle-icon" />
          <span>原始参数</span>
        </button>
      </div>
      <pre class="code-body"><code class="hljs" v-html="highlightedCode" /></pre>
      <pre v-if="showRawArgs" class="raw-args">{{ $props.arguments }}</pre>
    </div>
    <div v-else class="fallback-section">
      <div class="section-label">参数</div>
      <pre class="fallback-content">{{ $props.arguments }}</pre>
    </div>

    <div v-if="result || status === 'completed' || status === 'error'" class="output-section">
      <div class="output-header">
        <span class="section-label">{{ isError ? '错误' : '输出' }}</span>
      </div>
      <pre class="output-body" :class="{ error: isError, empty: !result }">{{ result || '(无输出)' }}</pre>
    </div>
  </div>
</template>

<style scoped>
.code-execute-renderer {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.code-section {
  border-radius: 4px;
  overflow: hidden;
  border: 1px solid hsl(var(--border));
}

.code-header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  background: hsl(var(--muted) / 40%);
  border-bottom: 1px solid hsl(var(--border));
  font-size: 11px;
}

.code-header-icon {
  width: 12px;
  height: 12px;
  color: hsl(var(--muted-foreground));
}

.lang-label {
  font-weight: 600;
  color: hsl(var(--foreground));
  font-size: 11px;
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
}

.code-body code {
  font-family: inherit;
  font-size: inherit;
}

.raw-args {
  margin: 0;
  padding: 6px 10px;
  font-size: 10px;
  line-height: 1.4;
  font-family: 'SF Mono', 'Menlo', monospace;
  background: hsl(var(--muted) / 20%);
  color: hsl(var(--muted-foreground));
  border-top: 1px dashed hsl(var(--border));
  white-space: pre-wrap;
  word-break: break-all;
  max-height: 120px;
  overflow-y: auto;
}

.output-section {
  border-radius: 4px;
  overflow: hidden;
}

.output-header {
  display: flex;
  align-items: center;
  gap: 4px;
}

.section-label {
  font-size: 11px;
  color: hsl(var(--muted-foreground));
  font-weight: 500;
  margin-bottom: 4px;
}

.output-body {
  margin: 0;
  padding: 6px 10px;
  font-size: 11px;
  line-height: 1.5;
  font-family: 'SF Mono', 'Menlo', 'Consolas', monospace;
  background: #1a1b26;
  color: #a9b1d6;
  border-radius: 4px;
  white-space: pre-wrap;
  word-break: break-all;
  max-height: 200px;
  overflow-y: auto;
}

.output-body.error {
  color: #ff4d4f;
  background: rgba(255, 77, 79, 0.08);
}

.output-body.empty {
  color: hsl(var(--muted-foreground));
  font-style: italic;
  background: hsl(var(--muted) / 20%);
}

.fallback-content {
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
}
</style>
