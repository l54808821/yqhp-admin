<script setup lang="ts">
import { createIconifyIcon } from '@vben/icons';
import type { VerificationBlock } from '../types';

const ShieldCheck = createIconifyIcon('lucide:shield-check');
const LoaderIcon = createIconifyIcon('lucide:loader-2');

defineProps<{
  block: VerificationBlock;
}>();
</script>

<template>
  <div class="verification-block" :class="block.status">
    <component
      :is="block.status === 'verifying' ? LoaderIcon : ShieldCheck"
      class="verify-icon"
      :class="{ spinning: block.status === 'verifying' }"
    />
    <span class="verify-label">
      {{ block.status === 'verifying' ? '正在验证回答质量...' : (block.verified ? '验证通过' : '验证完成') }}
    </span>
  </div>
</template>

<style scoped>
.verification-block {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  border-radius: 6px;
  font-size: 12px;
  color: hsl(var(--muted-foreground));
  background: hsl(var(--muted) / 20%);
}

.verification-block.completed {
  color: #52c41a;
  background: #52c41a10;
}

.verify-icon {
  width: 14px;
  height: 14px;
  flex-shrink: 0;
}

.spinning {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.verify-label {
  font-size: 12px;
}
</style>
