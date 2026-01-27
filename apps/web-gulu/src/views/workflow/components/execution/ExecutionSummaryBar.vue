<script setup lang="ts">
import type { ExecutionSummary } from './types';

interface Props {
  summary: ExecutionSummary;
}

defineProps<Props>();

// 格式化时长
function formatDuration(ms?: number) {
  if (!ms) return '-';
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}
</script>

<template>
  <div class="summary-bar">
    <span>总步骤: <strong>{{ summary.totalSteps }}</strong></span>
    <span class="success">成功: <strong>{{ summary.successSteps }}</strong></span>
    <span class="error">失败: <strong>{{ summary.failedSteps }}</strong></span>
    <span>耗时: <strong>{{ formatDuration(summary.totalDurationMs) }}</strong></span>
  </div>
</template>

<style scoped>
.summary-bar {
  display: flex;
  gap: 24px;
  padding: 8px 12px;
  background: #fafafa;
  border-radius: 4px;
  font-size: 13px;
}

.summary-bar .success {
  color: #52c41a;
}

.summary-bar .error {
  color: #ff4d4f;
}
</style>
