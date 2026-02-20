<script setup lang="ts">
import { ref } from 'vue';
import { Button } from 'ant-design-vue';
import { createIconifyIcon } from '@vben/icons';
import AiMarkdownRenderer from './AiMarkdownRenderer.vue';

const BulbIcon = createIconifyIcon('lucide:lightbulb');
const ChevronDownIcon = createIconifyIcon('lucide:chevron-down');
const ChevronUpIcon = createIconifyIcon('lucide:chevron-up');
const LoaderIcon = createIconifyIcon('lucide:loader-2');

defineProps<{
  content: string;
  isComplete?: boolean;
}>();

const collapsed = ref(false);
</script>

<template>
  <div class="thinking-block">
    <div class="thinking-header" @click="collapsed = !collapsed">
      <BulbIcon class="thinking-icon" />
      <span class="thinking-label">
        {{ isComplete ? '已深度思考' : '思考中...' }}
      </span>
      <LoaderIcon v-if="!isComplete" class="thinking-spinner" />
      <Button type="text" size="small" class="thinking-toggle">
        <template #icon>
          <ChevronUpIcon v-if="collapsed" class="toggle-icon" />
          <ChevronDownIcon v-else class="toggle-icon" />
        </template>
      </Button>
    </div>
    <div v-show="!collapsed" class="thinking-content">
      <AiMarkdownRenderer :content="content" :streaming="!isComplete" />
    </div>
  </div>
</template>

<style scoped>
.thinking-block {
  margin-bottom: 8px;
  border-radius: 8px;
  border: 1px solid hsl(var(--border) / 40%);
  overflow: hidden;
}

.thinking-header {
  display: flex;
  gap: 6px;
  align-items: center;
  padding: 8px 12px;
  cursor: pointer;
  background: hsl(var(--accent) / 30%);
  transition: background 0.2s;
}

.thinking-header:hover {
  background: hsl(var(--accent) / 50%);
}

.thinking-icon {
  width: 16px;
  height: 16px;
  color: #faad14;
}

.thinking-label {
  font-size: 13px;
  font-weight: 500;
  color: hsl(var(--foreground) / 70%);
}

.thinking-spinner {
  width: 14px;
  height: 14px;
  color: hsl(var(--foreground) / 50%);
  animation: spin 1.5s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.thinking-toggle {
  margin-left: auto;
  color: hsl(var(--foreground) / 50%);
}

.toggle-icon {
  width: 14px;
  height: 14px;
}

.thinking-content {
  padding: 10px 14px;
  font-size: 13px;
  color: hsl(var(--foreground) / 70%);
  border-top: 1px solid hsl(var(--border) / 30%);
}
</style>
