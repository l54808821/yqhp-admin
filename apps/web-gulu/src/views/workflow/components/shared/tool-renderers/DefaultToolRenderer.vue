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
    <div v-if="result || status === 'completed' || status === 'error'" class="detail-section">
      <pre class="detail-content" :class="{ error: isError, empty: !result }">{{ result || '(无输出)' }}</pre>
    </div>
    <div v-else class="waiting">
      <span class="waiting-text">执行中...</span>
    </div>
  </div>
</template>

<style scoped>
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

.waiting {
  padding: 4px 0;
}

.waiting-text {
  font-size: 11px;
  color: hsl(var(--muted-foreground));
  font-style: italic;
}
</style>
