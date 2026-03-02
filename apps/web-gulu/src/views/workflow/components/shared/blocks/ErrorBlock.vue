<script setup lang="ts">
import { createIconifyIcon } from '@vben/icons';
import type { ErrorBlock } from '../types';

const AlertIcon = createIconifyIcon('lucide:alert-circle');

defineProps<{
  block: ErrorBlock;
}>();
</script>

<template>
  <div class="error-block">
    <AlertIcon class="error-icon" />
    <span>{{ block.message }}</span>
  </div>
</template>

<style scoped>
.error-block {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: #ff4d4f10;
  border: 1px solid #ff4d4f30;
  border-radius: 6px;
  color: #ff4d4f;
  font-size: 13px;
}

.error-icon {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
}
</style>
