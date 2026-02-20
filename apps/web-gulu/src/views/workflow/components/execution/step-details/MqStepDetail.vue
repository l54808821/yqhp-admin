<script setup lang="ts">
import { computed, ref } from 'vue';

import { createIconifyIcon } from '@vben/icons';
import { Alert, Badge, Tabs, Tag } from 'ant-design-vue';

import { ResponseBodyEditor } from '#/components/code-editor';

import type { StepResult } from '#/api/debug';
import { ConsoleLogPanel } from '../../shared';

const CheckCircleIcon = createIconifyIcon('lucide:check-circle');
const XCircleIcon = createIconifyIcon('lucide:x-circle');

interface Props {
  stepResult: StepResult;
}

const props = defineProps<Props>();

const activeTab = ref('result');

const output = computed(() => props.stepResult.output as any ?? null);

const isError = computed(() => !output.value?.success && !!output.value?.error);

const statusDisplay = computed(() => {
  if (!output.value) return '-';
  if (isError.value) return 'Error';
  return output.value.success ? 'Success' : 'Failed';
});

const statusColor = computed(() => {
  if (!output.value || isError.value) return '#ff4d4f';
  return output.value.success ? '#52c41a' : '#ff4d4f';
});

function formatDuration(ms?: number): string {
  if (ms == null || Number.isNaN(ms)) return '-';
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

const actionLabel = computed(() => {
  const a = output.value?.action;
  return a === 'send' || a === 'publish' ? '发送' : '接收';
});

const messagesJson = computed(() => {
  const msgs = output.value?.messages || [];
  return JSON.stringify(msgs, null, 2);
});

const hasConsole = computed(() => output.value?.consoleLogs?.length > 0);
const consoleCount = computed(() => output.value?.consoleLogs?.length || 0);
const assertions = computed(() => output.value?.assertions || []);
const hasAssertions = computed(() => assertions.value.length > 0);
const passedCount = computed(() => assertions.value.filter((a: any) => a.passed).length);
const failedCount = computed(() => assertions.value.filter((a: any) => !a.passed).length);
</script>

<template>
  <div class="mq-step-detail">
    <Alert
      v-if="stepResult.error"
      type="error"
      :message="stepResult.error"
      class="error-alert"
    />

    <template v-if="output">
      <!-- 状态栏 -->
      <div class="response-header">
        <Tabs v-model:activeKey="activeTab" size="small" class="response-tabs">
          <Tabs.TabPane key="result" tab="结果" />
          <Tabs.TabPane key="messages" tab="消息" />
          <Tabs.TabPane key="assertions" v-if="hasAssertions" tab="断言" />
          <Tabs.TabPane key="console" v-if="hasConsole">
            <template #tab>
              <span>控制台</span>
              <span v-if="consoleCount > 0" class="tab-count">{{ consoleCount }}</span>
            </template>
          </Tabs.TabPane>
        </Tabs>
        <div class="response-meta">
          <Tag :color="statusColor" class="status-tag">{{ statusDisplay }}</Tag>
          <span class="meta-item">{{ formatDuration(output.durationMs ?? output.duration) }}</span>
        </div>
      </div>

      <div class="response-content">
        <!-- 结果 -->
        <div v-if="activeTab === 'result'" class="tab-content">
          <div v-if="isError" class="error-display">
            <pre class="error-msg">{{ output.error }}</pre>
          </div>
          <div v-else class="result-grid">
            <div class="info-row">
              <span class="info-label">操作</span>
              <span class="info-value">{{ actionLabel }}</span>
            </div>
            <div v-if="output.topic" class="info-row">
              <span class="info-label">Topic</span>
              <span class="info-value mono">{{ output.topic }}</span>
            </div>
            <div v-if="output.queue" class="info-row">
              <span class="info-label">Queue</span>
              <span class="info-value mono">{{ output.queue }}</span>
            </div>
            <div class="info-row">
              <span class="info-label">消息数</span>
              <span class="info-value">{{ output.count ?? output.messages?.length ?? 0 }}</span>
            </div>
          </div>
        </div>

        <!-- 消息 JSON -->
        <div v-else-if="activeTab === 'messages'" class="tab-content json-tab">
          <ResponseBodyEditor :body="messagesJson" body-type="json" height="100%" />
        </div>

        <!-- 断言 -->
        <div v-else-if="activeTab === 'assertions'" class="tab-content">
          <div class="assertion-summary">
            <Badge :count="passedCount" :number-style="{ backgroundColor: '#52c41a' }" />
            <span>通过</span>
            <Badge :count="failedCount" :number-style="{ backgroundColor: '#ff4d4f' }" />
            <span>失败</span>
          </div>
          <div class="assertion-list">
            <div
              v-for="(a, idx) in assertions"
              :key="idx"
              class="assertion-item"
              :class="{ passed: a.passed, failed: !a.passed }"
            >
              <component :is="a.passed ? CheckCircleIcon : XCircleIcon" class="assertion-icon" />
              <span class="assertion-name">{{ a.name }}</span>
              <span v-if="a.message" class="assertion-msg">{{ a.message }}</span>
            </div>
          </div>
        </div>

        <!-- 控制台 -->
        <div v-else-if="activeTab === 'console'" class="tab-content console-tab">
          <ConsoleLogPanel :logs="output.consoleLogs || []" />
        </div>
      </div>
    </template>

    <div v-else class="empty-state">无响应数据</div>
  </div>
</template>

<style scoped>
.mq-step-detail {
  display: flex;
  flex-direction: column;
  gap: 8px;
  height: 100%;
  min-height: 0;
}

.error-alert {
  margin: 0;
  flex-shrink: 0;
}

.response-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid hsl(var(--border));
  flex-shrink: 0;
  padding: 0 8px;
}

.response-tabs {
  flex: 1;
}

.response-tabs :deep(.ant-tabs-nav) {
  margin: 0;
}

.response-tabs :deep(.ant-tabs-nav::before) {
  border-bottom: none;
}

.response-tabs :deep(.ant-tabs-tab) {
  padding: 6px 0;
  font-size: 13px;
}

.response-tabs :deep(.ant-tabs-tab + .ant-tabs-tab) {
  margin-left: 16px;
}

.tab-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 16px;
  height: 16px;
  padding: 0 4px;
  margin-left: 4px;
  font-size: 10px;
  color: hsl(var(--foreground) / 50%);
  background: hsl(var(--accent));
  border-radius: 8px;
}

.response-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.status-tag {
  font-size: 12px;
  font-weight: 600;
  padding: 0 6px;
  line-height: 20px;
  border-radius: 3px;
  margin: 0;
}

.meta-item {
  font-size: 12px;
  color: hsl(var(--foreground) / 55%);
}

.response-content {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.tab-content {
  height: 100%;
  overflow: auto;
}

.json-tab {
  padding: 0;
}

.result-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  padding: 12px;
}

.info-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: hsl(var(--accent) / 30%);
  border-radius: 6px;
}

.info-label {
  font-size: 12px;
  color: hsl(var(--foreground) / 50%);
  white-space: nowrap;
}

.info-value {
  font-size: 13px;
  font-weight: 500;
  color: hsl(var(--foreground) / 85%);
}

.info-value.mono {
  font-family: 'SF Mono', 'Monaco', 'Menlo', monospace;
}

.error-display {
  padding: 12px;
}

.error-msg {
  margin: 0;
  padding: 12px;
  font-family: 'SF Mono', 'Monaco', 'Menlo', monospace;
  font-size: 12px;
  background: hsl(0 84% 60% / 8%);
  border: 1px solid hsl(0 84% 60% / 20%);
  border-radius: 6px;
  white-space: pre-wrap;
  word-break: break-all;
  color: hsl(var(--foreground) / 80%);
}

.assertion-summary {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: hsl(var(--accent) / 30%);
  border-radius: 4px;
  margin: 12px;
}

.assertion-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 0 12px 12px;
}

.assertion-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 4px;
}

.assertion-item.passed {
  background: hsl(142 76% 36% / 10%);
  border: 1px solid hsl(142 76% 36% / 30%);
}

.assertion-item.failed {
  background: hsl(0 84% 60% / 10%);
  border: 1px solid hsl(0 84% 60% / 30%);
}

.assertion-icon {
  width: 14px;
  height: 14px;
}

.assertion-item.passed .assertion-icon {
  color: #52c41a;
}

.assertion-item.failed .assertion-icon {
  color: #ff4d4f;
}

.assertion-name {
  font-weight: 500;
  font-size: 13px;
}

.assertion-msg {
  color: hsl(var(--foreground) / 55%);
  font-size: 12px;
}

.console-tab {
  padding: 8px 0;
}

.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: hsl(var(--foreground) / 45%);
}
</style>
