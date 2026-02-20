<script setup lang="ts">
import { computed } from 'vue';
import { Collapse, Tag } from 'ant-design-vue';
import type { ToolCallRecord } from './types';

const props = defineProps<{
  toolCall: ToolCallRecord;
}>();

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

function truncate(text: string, max = 500): string {
  if (!text) return '';
  return text.length > max ? `${text.slice(0, max)}...` : text;
}

const cardClass = computed(() =>
  props.toolCall.is_error ? 'tc-card--error' : 'tc-card--success',
);
</script>

<template>
  <Collapse :bordered="false" expand-icon-position="end" class="tc-collapse">
    <Collapse.Panel :class="cardClass">
      <template #header>
        <div class="tc-header">
          <span class="tc-icon">⚙</span>
          <span class="tc-name">{{ toolCall.tool_name }}</span>
          <span
            class="tc-status"
            :class="toolCall.is_error ? 'tc-status--error' : 'tc-status--success'"
          >
            {{ toolCall.is_error ? '执行失败' : '执行成功' }}
          </span>
          <Tag size="small" color="purple" class="tc-tag">local</Tag>
          <span class="tc-spacer" />
          <span class="tc-duration">{{ formatDuration(toolCall.duration_ms) }}</span>
        </div>
      </template>
      <div class="tc-body">
        <div class="tc-row">
          <span class="tc-label">参数</span>
          <pre class="tc-code">{{ truncate(toolCall.arguments) }}</pre>
        </div>
        <div class="tc-row">
          <span class="tc-label">结果</span>
          <pre class="tc-code" :class="{ 'tc-code--error': toolCall.is_error }">{{
            truncate(toolCall.result)
          }}</pre>
        </div>
      </div>
    </Collapse.Panel>
  </Collapse>
</template>

<style scoped>
.tc-collapse {
  background: transparent;
}

.tc-collapse :deep(.ant-collapse-item) {
  margin-bottom: 0;
  overflow: hidden;
  border: none !important;
  border-radius: 8px !important;
}

.tc-collapse :deep(.ant-collapse-item.tc-card--success) {
  border: 1px solid #4f6ef7 !important;
}

.tc-collapse :deep(.ant-collapse-item.tc-card--error) {
  border: 1px solid #ff4d4f !important;
}

.tc-collapse :deep(.ant-collapse-item.tc-card--success > .ant-collapse-header) {
  background: linear-gradient(135deg, #f0f5ff 0%, #e8efff 100%);
}

.tc-collapse :deep(.ant-collapse-item.tc-card--error > .ant-collapse-header) {
  background: linear-gradient(135deg, #fff2f0 0%, #ffe8e6 100%);
}

.tc-collapse :deep(.ant-collapse-header) {
  padding: 10px 14px !important;
  font-size: 13px;
  align-items: center !important;
}

.tc-collapse :deep(.ant-collapse-content) {
  background: transparent;
  border-top: 1px solid hsl(var(--border) / 30%);
}

.tc-collapse :deep(.ant-collapse-content-box) {
  padding: 12px 14px !important;
}

.tc-header {
  display: flex;
  gap: 8px;
  align-items: center;
  width: 100%;
}

.tc-icon {
  font-size: 14px;
  opacity: 0.7;
}

.tc-name {
  font-size: 13px;
  font-weight: 600;
  color: hsl(var(--foreground) / 90%);
}

.tc-status {
  font-size: 12px;
  font-weight: 500;
}

.tc-status--success { color: #52c41a; }
.tc-status--error { color: #ff4d4f; }

.tc-tag {
  margin: 0;
  font-size: 11px;
  border-radius: 4px;
}

.tc-spacer { flex: 1; }

.tc-duration {
  font-size: 12px;
  font-weight: 500;
  font-family: 'SF Mono', Monaco, Menlo, monospace;
  color: #4f6ef7;
}

.tc-body {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.tc-row {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.tc-label {
  font-size: 11px;
  font-weight: 600;
  color: hsl(var(--foreground) / 50%);
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.tc-code {
  padding: 8px 10px;
  margin: 0;
  font-size: 12px;
  font-family: 'SF Mono', Monaco, Menlo, monospace;
  line-height: 1.5;
  color: hsl(var(--foreground) / 80%);
  word-break: break-all;
  white-space: pre-wrap;
  background: hsl(var(--background));
  border: 1px solid hsl(var(--border) / 40%);
  border-radius: 6px;
}

.tc-code--error {
  color: #ff4d4f;
  background: #fff2f0;
  border-color: hsl(0 84% 60% / 20%);
}
</style>
