<script setup lang="ts">
import { ref, computed } from 'vue';

import { createIconifyIcon } from '@vben/icons';
import type { ToolCallBlock } from '../types';

const WrenchIcon = createIconifyIcon('lucide:wrench');
const CheckIcon = createIconifyIcon('lucide:check');
const XIcon = createIconifyIcon('lucide:x');
const LoaderIcon = createIconifyIcon('lucide:loader-2');
const ChevronDown = createIconifyIcon('lucide:chevron-down');
const ChevronRight = createIconifyIcon('lucide:chevron-right');

const props = defineProps<{
  block: ToolCallBlock;
  compact?: boolean;
}>();

const expanded = ref(false);

const statusIcon = computed(() => {
  switch (props.block.status) {
    case 'running': return LoaderIcon;
    case 'completed': return CheckIcon;
    case 'error': return XIcon;
    default: return WrenchIcon;
  }
});

const statusColor = computed(() => {
  switch (props.block.status) {
    case 'running': return 'hsl(var(--primary))';
    case 'completed': return '#52c41a';
    case 'error': return '#ff4d4f';
    default: return 'hsl(var(--muted-foreground))';
  }
});

const durationText = computed(() => {
  if (!props.block.durationMs) return '';
  if (props.block.durationMs < 1000) return `${props.block.durationMs}ms`;
  return `${(props.block.durationMs / 1000).toFixed(1)}s`;
});
</script>

<template>
  <div class="tool-call-block" :class="{ compact, expanded }">
    <div class="tool-header" @click="expanded = !expanded">
      <WrenchIcon class="tool-icon" />
      <span class="tool-name">{{ block.name }}</span>
      <component :is="statusIcon" class="status-icon" :style="{ color: statusColor }" :class="{ spinning: block.status === 'running' }" />
      <span v-if="durationText" class="duration">{{ durationText }}</span>
      <component :is="expanded ? ChevronDown : ChevronRight" class="chevron" />
    </div>
    <div v-if="expanded" class="tool-detail">
      <div v-if="block.arguments" class="detail-section">
        <div class="detail-label">参数</div>
        <pre class="detail-content">{{ block.arguments }}</pre>
      </div>
      <div v-if="block.result || block.status === 'completed' || block.status === 'error'" class="detail-section">
        <div class="detail-label">{{ block.isError ? '错误' : '结果' }}</div>
        <pre class="detail-content" :class="{ error: block.isError, empty: !block.result }">{{ block.result || '(无输出)' }}</pre>
      </div>
    </div>
  </div>
</template>

<style scoped>
.tool-call-block {
  border: 1px solid hsl(var(--border));
  border-radius: 6px;
  overflow: hidden;
  font-size: 12px;
}

.tool-header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  cursor: pointer;
  background: hsl(var(--muted) / 20%);
  user-select: none;
}

.tool-header:hover {
  background: hsl(var(--muted) / 40%);
}

.tool-icon {
  width: 13px;
  height: 13px;
  color: hsl(var(--muted-foreground));
  flex-shrink: 0;
}

.tool-name {
  flex: 1;
  font-weight: 500;
  color: hsl(var(--foreground));
  font-family: 'SF Mono', 'Menlo', monospace;
  font-size: 12px;
}

.status-icon {
  width: 13px;
  height: 13px;
  flex-shrink: 0;
}

.spinning {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.duration {
  font-size: 11px;
  color: hsl(var(--muted-foreground));
}

.chevron {
  width: 12px;
  height: 12px;
  color: hsl(var(--muted-foreground));
}

.tool-detail {
  border-top: 1px solid hsl(var(--border));
  padding: 8px 10px;
}

.detail-section + .detail-section {
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px dashed hsl(var(--border));
}

.detail-label {
  font-size: 11px;
  color: hsl(var(--muted-foreground));
  margin-bottom: 4px;
  font-weight: 500;
}

.detail-content {
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

.detail-content.error {
  color: #ff4d4f;
}

.detail-content.empty {
  color: hsl(var(--muted-foreground));
  font-style: italic;
}
</style>
