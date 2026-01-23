<script setup lang="ts">
import { Modal } from 'ant-design-vue';

interface Props {
  open: boolean;
  logs: string[];
}

defineProps<Props>();

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void;
}>();
</script>

<template>
  <Modal
    :open="open"
    title="执行日志"
    :width="700"
    :footer="null"
    @update:open="emit('update:open', $event)"
  >
    <div class="logs-container">
      <div v-for="(log, idx) in logs" :key="idx" class="log-line">{{ log }}</div>
      <div v-if="logs.length === 0" class="empty-logs">暂无日志</div>
    </div>
  </Modal>
</template>

<style scoped>
.logs-container {
  max-height: 400px;
  overflow: auto;
  font-family: monospace;
  font-size: 12px;
  background: #1e1e1e;
  color: #d4d4d4;
  padding: 12px;
  border-radius: 4px;
}

.log-line {
  white-space: pre-wrap;
  word-break: break-all;
}

.empty-logs {
  text-align: center;
  color: #999;
  padding: 20px;
}
</style>
