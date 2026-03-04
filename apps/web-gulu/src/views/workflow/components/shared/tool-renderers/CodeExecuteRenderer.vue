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
  <div class="code-execute-renderer">
    <div v-if="result || status === 'completed' || status === 'error'" class="output-section">
      <pre class="output-body" :class="{ error: isError, empty: !result }">{{ result || '(无输出)' }}</pre>
    </div>
    <div v-else class="waiting">
      <span class="waiting-text">执行中...</span>
    </div>
  </div>
</template>

<style scoped>
.code-execute-renderer {
  display: flex;
  flex-direction: column;
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

.waiting {
  padding: 4px 0;
}

.waiting-text {
  font-size: 11px;
  color: hsl(var(--muted-foreground));
  font-style: italic;
}
</style>
