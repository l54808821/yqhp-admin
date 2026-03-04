<script setup lang="ts">
import { computed } from 'vue';

import { createIconifyIcon } from '@vben/icons';

import { tryParseJSON } from './useHighlight';

const TerminalIcon = createIconifyIcon('lucide:terminal');

const props = defineProps<{
  name: string;
  arguments: string;
}>();

const parsed = computed(() => tryParseJSON(props.arguments));
const command = computed(() => parsed.value?.command || '');
const workingDir = computed(() => parsed.value?.working_dir || parsed.value?.workingDir || '');
const timeout = computed(() => parsed.value?.timeout || 0);
</script>

<template>
  <div class="shell-params">
    <div v-if="workingDir || timeout" class="meta-line">
      <span v-if="workingDir" class="working-dir">📂 {{ workingDir }}</span>
      <span v-if="timeout" class="timeout-badge">⏱ {{ timeout }}s</span>
    </div>
    <div class="command-block">
      <TerminalIcon class="terminal-icon" />
      <span class="prompt">$</span>
      <span class="command-text">{{ command || $props.arguments }}</span>
    </div>
  </div>
</template>

<style scoped>
.shell-params {
  min-width: 260px;
  max-width: 480px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.meta-line {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 10px;
  color: hsl(var(--muted-foreground));
}

.working-dir {
  font-family: 'SF Mono', 'Menlo', monospace;
}

.timeout-badge {
  color: hsl(var(--muted-foreground));
}

.command-block {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  padding: 8px 10px;
  background: #1a1b26;
  border-radius: 4px;
  font-family: 'SF Mono', 'Menlo', 'Consolas', monospace;
  font-size: 11px;
  line-height: 1.6;
}

.terminal-icon {
  width: 12px;
  height: 12px;
  color: #52c41a;
  flex-shrink: 0;
  margin-top: 2px;
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
</style>
