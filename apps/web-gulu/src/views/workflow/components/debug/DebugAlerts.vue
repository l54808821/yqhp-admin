<script setup lang="ts">
import { Alert, Button } from 'ant-design-vue';

interface Props {
  errorMessage: string | null;
  disconnected: boolean;
  reconnecting: boolean;
  reconnectAttempts: number;
  maxReconnectAttempts: number;
  hasDebugSummary: boolean;
}

defineProps<Props>();

const emit = defineEmits<{
  (e: 'clearError'): void;
  (e: 'reconnect'): void;
}>();
</script>

<template>
  <!-- 错误提示 -->
  <Alert
    v-if="errorMessage && !disconnected"
    type="error"
    :message="errorMessage"
    closable
    class="error-alert"
    @close="emit('clearError')"
  />

  <!-- 连接断开提示 -->
  <Alert v-if="disconnected && !hasDebugSummary" type="warning" class="disconnect-alert">
    <template #message>
      <div class="disconnect-message">
        <span v-if="reconnecting">
          {{ errorMessage || '正在尝试重连...' }}
        </span>
        <span v-else>
          连接已断开
          <span v-if="reconnectAttempts >= maxReconnectAttempts">（已达最大重试次数）</span>
        </span>
        <Button v-if="!reconnecting" type="link" size="small" @click="emit('reconnect')">
          重新连接
        </Button>
      </div>
    </template>
  </Alert>
</template>

<style scoped>
.error-alert {
  margin: 4px 0;
}

.disconnect-alert {
  margin: 4px 0;
}

.disconnect-message {
  display: flex;
  align-items: center;
  gap: 8px;
}
</style>
