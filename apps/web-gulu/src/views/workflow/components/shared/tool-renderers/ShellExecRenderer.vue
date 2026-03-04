<script setup lang="ts">
import { computed, ref } from 'vue';

import { createIconifyIcon } from '@vben/icons';

import { tryParseJSON } from './useHighlight';

const TerminalIcon = createIconifyIcon('lucide:terminal');
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
const command = computed(() => parsed.value?.command || '');
const workingDir = computed(() => parsed.value?.working_dir || parsed.value?.workingDir || '');
const timeout = computed(() => parsed.value?.timeout || 0);
</script>

<template>
  <div class="shell-exec-renderer">
    <div class="command-section">
      <div class="command-header">
        <TerminalIcon class="terminal-icon" />
        <span class="terminal-label">Shell</span>
        <span v-if="workingDir" class="working-dir">{{ workingDir }}</span>
        <span v-if="timeout" class="timeout-badge">{{ timeout }}s</span>
        <button class="raw-toggle" @click.stop="showRawArgs = !showRawArgs">
          <component :is="showRawArgs ? ChevronDown : ChevronRight" class="raw-toggle-icon" />
          <span>原始参数</span>
        </button>
      </div>
      <div v-if="command" class="command-body">
        <span class="prompt">$</span>
        <span class="command-text">{{ command }}</span>
      </div>
      <pre v-if="showRawArgs" class="raw-args">{{ $props.arguments }}</pre>
    </div>

    <div v-if="result || status === 'completed' || status === 'error'" class="output-section">
      <div class="section-label">{{ isError ? '错误' : '输出' }}</div>
      <pre class="output-body" :class="{ error: isError, empty: !result }">{{ result || '(无输出)' }}</pre>
    </div>
  </div>
</template>

<style scoped>
.shell-exec-renderer {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.command-section {
  border-radius: 4px;
  overflow: hidden;
  border: 1px solid hsl(var(--border));
}

.command-header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  background: hsl(var(--muted) / 40%);
  border-bottom: 1px solid hsl(var(--border));
  font-size: 11px;
}

.terminal-icon {
  width: 12px;
  height: 12px;
  color: #52c41a;
}

.terminal-label {
  font-weight: 600;
  color: hsl(var(--foreground));
  font-size: 11px;
}

.working-dir {
  font-size: 10px;
  color: hsl(var(--muted-foreground));
  font-family: 'SF Mono', 'Menlo', monospace;
}

.timeout-badge {
  font-size: 9px;
  color: hsl(var(--muted-foreground));
  background: hsl(var(--muted) / 40%);
  padding: 0 4px;
  border-radius: 3px;
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

.command-body {
  padding: 8px 10px;
  background: #1a1b26;
  font-family: 'SF Mono', 'Menlo', 'Consolas', monospace;
  font-size: 11px;
  line-height: 1.6;
  display: flex;
  gap: 6px;
}

.prompt {
  color: #52c41a;
  font-weight: 700;
  flex-shrink: 0;
  user-select: none;
}

.command-text {
  color: #a9b1d6;
  white-space: pre-wrap;
  word-break: break-all;
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
</style>
