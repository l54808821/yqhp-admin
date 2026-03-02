<script setup lang="ts">
import { ref } from 'vue';

import { createIconifyIcon } from '@vben/icons';
import type { ThinkingBlock } from '../types';

const ChevronDown = createIconifyIcon('lucide:chevron-down');
const ChevronRight = createIconifyIcon('lucide:chevron-right');
const BrainIcon = createIconifyIcon('lucide:brain');

defineProps<{
  block: ThinkingBlock;
}>();

const expanded = ref(false);
</script>

<template>
  <div class="thinking-block" :class="{ expanded }">
    <div class="thinking-header" @click="expanded = !expanded">
      <BrainIcon class="icon" />
      <span class="label">{{ block.isComplete ? '已深度思考' : '正在思考...' }}</span>
      <component :is="expanded ? ChevronDown : ChevronRight" class="chevron" />
    </div>
    <div v-if="expanded" class="thinking-content">
      {{ block.content }}
    </div>
  </div>
</template>

<style scoped>
.thinking-block {
  border: 1px solid hsl(var(--border));
  border-radius: 8px;
  overflow: hidden;
  font-size: 13px;
}

.thinking-header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  cursor: pointer;
  background: hsl(var(--muted) / 30%);
  user-select: none;
}

.thinking-header:hover {
  background: hsl(var(--muted) / 50%);
}

.icon {
  width: 14px;
  height: 14px;
  color: hsl(var(--primary));
}

.label {
  flex: 1;
  color: hsl(var(--muted-foreground));
  font-size: 12px;
}

.chevron {
  width: 14px;
  height: 14px;
  color: hsl(var(--muted-foreground));
}

.thinking-content {
  padding: 10px 12px;
  color: hsl(var(--muted-foreground));
  font-size: 12px;
  line-height: 1.6;
  white-space: pre-wrap;
  border-top: 1px solid hsl(var(--border));
}
</style>
