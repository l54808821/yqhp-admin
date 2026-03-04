<script setup lang="ts">
defineProps<{
  name: string;
  arguments: string;
  result?: string;
  isError?: boolean;
  status: 'running' | 'completed' | 'error';
}>();
</script>

<template>
  <div class="default-tool-renderer">
    <div v-if="$props.arguments" class="detail-section">
      <div class="detail-label">参数</div>
      <pre class="detail-content">{{ $props.arguments }}</pre>
    </div>
    <div v-if="result || status === 'completed' || status === 'error'" class="detail-section">
      <div class="detail-label">{{ isError ? '错误' : '结果' }}</div>
      <pre class="detail-content" :class="{ error: isError, empty: !result }">{{ result || '(无输出)' }}</pre>
    </div>
  </div>
</template>

<style scoped>
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
