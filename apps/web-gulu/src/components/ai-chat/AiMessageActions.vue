<script setup lang="ts">
import { ref } from 'vue';
import { Button, Tooltip, message } from 'ant-design-vue';
import { createIconifyIcon } from '@vben/icons';

const CopyIcon = createIconifyIcon('lucide:copy');
const CheckIcon = createIconifyIcon('lucide:check');
const RefreshIcon = createIconifyIcon('lucide:refresh-cw');

const props = defineProps<{
  content: string;
  showRegenerate?: boolean;
}>();

const emit = defineEmits<{
  regenerate: [];
}>();

const copied = ref(false);

async function handleCopy() {
  try {
    await navigator.clipboard.writeText(props.content);
    copied.value = true;
    setTimeout(() => (copied.value = false), 2000);
  } catch {
    message.error('复制失败');
  }
}
</script>

<template>
  <div class="msg-actions">
    <Tooltip :title="copied ? '已复制' : '复制'">
      <Button type="text" size="small" class="action-btn" @click="handleCopy">
        <template #icon>
          <CheckIcon v-if="copied" class="action-icon action-icon--success" />
          <CopyIcon v-else class="action-icon" />
        </template>
      </Button>
    </Tooltip>
    <Tooltip v-if="showRegenerate" title="重新生成">
      <Button type="text" size="small" class="action-btn" @click="emit('regenerate')">
        <template #icon>
          <RefreshIcon class="action-icon" />
        </template>
      </Button>
    </Tooltip>
  </div>
</template>

<style scoped>
.msg-actions {
  display: flex;
  gap: 2px;
  align-items: center;
  padding-top: 6px;
  opacity: 0;
  transition: opacity 0.25s ease;
}

.ai-bubble-content:hover .msg-actions,
.msg-actions:hover {
  opacity: 1;
}

.action-btn {
  padding: 2px 8px;
  font-size: 12px;
  color: #999;
  border-radius: 6px;
  transition: all 0.2s;
}

.action-btn:hover {
  color: #333;
  background: rgba(0, 0, 0, 0.04);
}

.action-icon {
  width: 13px;
  height: 13px;
}

.action-icon--success {
  color: #52c41a;
}
</style>
