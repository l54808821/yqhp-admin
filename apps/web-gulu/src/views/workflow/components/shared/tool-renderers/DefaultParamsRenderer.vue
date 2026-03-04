<script setup lang="ts">
import { computed } from 'vue';

import { formatJSON, tryParseJSON } from './useHighlight';

const props = defineProps<{
  name: string;
  arguments: string;
}>();

const formatted = computed(() => {
  const parsed = tryParseJSON(props.arguments);
  if (parsed !== null) return formatJSON(props.arguments);
  return props.arguments;
});
</script>

<template>
  <div class="default-params">
    <pre class="params-content">{{ formatted }}</pre>
  </div>
</template>

<style scoped>
.default-params {
  max-width: 400px;
}

.params-content {
  margin: 0;
  font-size: 11px;
  line-height: 1.5;
  font-family: 'SF Mono', 'Menlo', monospace;
  white-space: pre-wrap;
  word-break: break-all;
  color: hsl(var(--foreground));
  max-height: 300px;
  overflow-y: auto;
}
</style>
