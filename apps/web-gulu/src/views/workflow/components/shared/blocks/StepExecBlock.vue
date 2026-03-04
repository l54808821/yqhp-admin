<script setup lang="ts">
import { computed } from 'vue';

import { createIconifyIcon } from '@vben/icons';
import type { StepExecBlock } from '../types';

const PlayIcon = createIconifyIcon('lucide:play');
const CheckIcon = createIconifyIcon('lucide:check');
const XIcon = createIconifyIcon('lucide:x');
const SkipIcon = createIconifyIcon('lucide:skip-forward');
const LoaderIcon = createIconifyIcon('lucide:loader-2');

const props = defineProps<{
  block: StepExecBlock;
}>();

const statusConfig = computed(() => {
  switch (props.block.status) {
    case 'running': return { icon: LoaderIcon, color: 'hsl(var(--primary))', label: '执行中', bg: 'hsl(var(--primary) / 8%)' };
    case 'completed': return { icon: CheckIcon, color: '#52c41a', label: '执行成功', bg: '#52c41a10' };
    case 'failed': return { icon: XIcon, color: '#ff4d4f', label: '执行失败', bg: '#ff4d4f10' };
    case 'skipped': return { icon: SkipIcon, color: '#8c8c8c', label: '已跳过', bg: '#8c8c8c10' };
    default: return { icon: PlayIcon, color: 'hsl(var(--muted-foreground))', label: '', bg: 'transparent' };
  }
});

const durationText = computed(() => {
  if (!props.block.durationMs) return '';
  if (props.block.durationMs < 1000) return `${props.block.durationMs}ms`;
  return `${(props.block.durationMs / 1000).toFixed(2)}s`;
});
</script>

<template>
  <div class="step-exec-block" :style="{ background: statusConfig.bg }">
    <div class="step-header">
      <component
        :is="statusConfig.icon"
        class="step-icon"
        :class="{ spinning: block.status === 'running' }"
        :style="{ color: statusConfig.color }"
      />
      <span class="step-name">{{ block.stepName }}</span>
      <span class="step-label" :style="{ color: statusConfig.color }">{{ statusConfig.label }}</span>
      <span v-if="durationText" class="step-duration">{{ durationText }}</span>
    </div>
    <div v-if="block.reason && block.status === 'failed'" class="step-reason">{{ block.reason }}</div>
  </div>
</template>

<style scoped>
.step-exec-block {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 6px 10px;
  border-radius: 6px;
  font-size: 12px;
}

.step-header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.step-icon {
  width: 14px;
  height: 14px;
  flex-shrink: 0;
}

.spinning {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.step-name {
  font-weight: 500;
  color: hsl(var(--foreground));
}

.step-label {
  font-size: 11px;
}

.step-reason {
  font-size: 11px;
  color: #ff4d4f;
  line-height: 1.5;
  word-break: break-word;
  padding-left: 22px;
}

.step-duration {
  margin-left: auto;
  font-size: 11px;
  color: hsl(var(--muted-foreground));
}
</style>
