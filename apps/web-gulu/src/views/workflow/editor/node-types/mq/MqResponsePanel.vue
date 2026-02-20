<script setup lang="ts">
import { ref, computed } from 'vue';

import { createIconifyIcon } from '@vben/icons';
import { Badge, Tabs, Tag } from 'ant-design-vue';

import { ResponseBodyEditor } from '#/components/code-editor';

import type { MqResponseData } from '../../types/mq';
import { ConsoleLogPanel } from '../../../components/shared';

const CheckCircleIcon = createIconifyIcon('lucide:check-circle');
const XCircleIcon = createIconifyIcon('lucide:x-circle');

interface Props {
  response: MqResponseData;
}

const props = defineProps<Props>();

const activeTab = ref('result');

const isError = computed(() => !props.response.success && !!props.response.error);

const statusDisplay = computed(() => {
  if (isError.value) return 'Error';
  return props.response.success ? 'Success' : 'Failed';
});

const statusColor = computed(() => {
  if (isError.value) return '#ff4d4f';
  return props.response.success ? '#52c41a' : '#ff4d4f';
});

function formatDuration(ms: number): string {
  if (ms == null || Number.isNaN(ms)) return '-';
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

const actionLabel = computed(() => {
  return props.response.action === 'send' || props.response.action === 'publish'
    ? '发送'
    : '接收';
});

const resultSummary = computed(() => {
  const r = props.response;
  if (r.action === 'send' || r.action === 'publish') {
    return r.success ? '已发送' : '发送失败';
  }
  return `${r.count ?? r.messages?.length ?? 0} 条消息`;
});

const messagesJson = computed(() => {
  const msgs = props.response.messages || [];
  return JSON.stringify(msgs, null, 2);
});

const hasConsoleOutput = computed(() => {
  return props.response.consoleLogs && props.response.consoleLogs.length > 0;
});

const consoleLogsCount = computed(() => props.response.consoleLogs?.length || 0);

const assertionResults = computed(() => props.response.assertions || []);
const hasAssertions = computed(() => assertionResults.value.length > 0);
const passedAssertions = computed(() => assertionResults.value.filter((a) => a.passed).length);
const failedAssertions = computed(() => assertionResults.value.filter((a) => !a.passed).length);
</script>

<template>
  <div class="mq-response-panel">
    <!-- 状态栏 -->
    <div class="response-header">
      <Tabs v-model:activeKey="activeTab" size="small" class="response-tabs">
        <Tabs.TabPane key="result" tab="结果" />
        <Tabs.TabPane key="messages" tab="消息" />
        <Tabs.TabPane key="assertions" v-if="hasAssertions" tab="断言" />
        <Tabs.TabPane key="console" v-if="hasConsoleOutput">
          <template #tab>
            <span>控制台</span>
            <span v-if="consoleLogsCount > 0" class="tab-count">{{ consoleLogsCount }}</span>
          </template>
        </Tabs.TabPane>
      </Tabs>

      <div class="response-meta">
        <Tag :color="statusColor" class="status-tag">{{ statusDisplay }}</Tag>
        <span class="meta-item">{{ formatDuration(response.durationMs) }}</span>
        <span class="meta-item meta-summary">{{ resultSummary }}</span>
      </div>
    </div>

    <!-- 内容区域 -->
    <div class="response-content">
      <!-- 结果 -->
      <div v-if="activeTab === 'result'" class="tab-content">
        <div v-if="isError" class="error-display">
          <div class="error-title">执行错误</div>
          <pre class="error-message">{{ response.error }}</pre>
        </div>
        <div v-else class="result-grid">
          <div class="info-row">
            <span class="info-label">操作</span>
            <span class="info-value">{{ actionLabel }}</span>
          </div>
          <div class="info-row">
            <span class="info-label">状态</span>
            <span class="info-value" :class="response.success ? 'text-green' : 'text-red'">
              {{ response.success ? '成功' : '失败' }}
            </span>
          </div>
          <div v-if="response.topic" class="info-row">
            <span class="info-label">Topic</span>
            <span class="info-value mono">{{ response.topic }}</span>
          </div>
          <div v-if="response.queue" class="info-row">
            <span class="info-label">Queue</span>
            <span class="info-value mono">{{ response.queue }}</span>
          </div>
          <div class="info-row">
            <span class="info-label">耗时</span>
            <span class="info-value">{{ formatDuration(response.durationMs) }}</span>
          </div>
          <div v-if="response.count != null" class="info-row">
            <span class="info-label">消息数</span>
            <span class="info-value">{{ response.count }}</span>
          </div>
        </div>
      </div>

      <!-- 消息 -->
      <div v-else-if="activeTab === 'messages'" class="tab-content">
        <template v-if="response.messages && response.messages.length > 0">
          <div
            v-for="(msg, idx) in response.messages"
            :key="idx"
            class="message-card"
          >
            <div class="message-header">
              <span class="message-index">#{{ idx + 1 }}</span>
              <span v-if="msg.topic" class="message-meta">{{ msg.topic }}</span>
              <span v-if="msg.key" class="message-meta">key: {{ msg.key }}</span>
              <span v-if="msg.timestamp" class="message-meta">{{ msg.timestamp }}</span>
            </div>
            <pre class="message-body">{{ msg.value }}</pre>
            <div v-if="msg.headers && Object.keys(msg.headers).length" class="message-headers">
              <span
                v-for="(hv, hk) in msg.headers"
                :key="hk"
                class="header-tag"
              >
                {{ hk }}: {{ hv }}
              </span>
            </div>
          </div>
        </template>
        <div v-else class="empty-messages">
          <ResponseBodyEditor :body="messagesJson" body-type="json" height="100%" />
        </div>
      </div>

      <!-- 断言 -->
      <div v-else-if="activeTab === 'assertions'" class="tab-content">
        <div class="assertion-summary">
          <Badge :count="passedAssertions" :number-style="{ backgroundColor: '#52c41a' }" />
          <span>通过</span>
          <Badge :count="failedAssertions" :number-style="{ backgroundColor: '#ff4d4f' }" />
          <span>失败</span>
        </div>
        <div class="assertion-list">
          <div
            v-for="(assertion, idx) in assertionResults"
            :key="idx"
            class="assertion-item"
            :class="{ passed: assertion.passed, failed: !assertion.passed }"
          >
            <component
              :is="assertion.passed ? CheckCircleIcon : XCircleIcon"
              class="assertion-icon"
            />
            <span class="assertion-name">{{ assertion.name }}</span>
            <span v-if="assertion.message" class="assertion-message">{{ assertion.message }}</span>
          </div>
        </div>
      </div>

      <!-- 控制台 -->
      <div v-else-if="activeTab === 'console'" class="tab-content console-content">
        <ConsoleLogPanel :logs="response.consoleLogs || []" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.mq-response-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 0 10px 10px;
  overflow: hidden;
}

.response-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid hsl(var(--border));
  flex-shrink: 0;
  padding-right: 8px;
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
  margin-left: 20px;
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

.meta-summary {
  font-weight: 500;
  color: hsl(var(--foreground) / 70%);
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

/* 结果信息网格 */
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

.info-value.text-green {
  color: #52c41a;
}

.info-value.text-red {
  color: #ff4d4f;
}

/* 错误 */
.error-display {
  padding: 16px;
}

.error-title {
  font-size: 14px;
  font-weight: 500;
  color: #ff4d4f;
  margin-bottom: 8px;
}

.error-message {
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

/* 消息卡片 */
.message-card {
  margin: 8px 12px;
  padding: 10px 12px;
  background: hsl(var(--accent) / 30%);
  border: 1px solid hsl(var(--border));
  border-radius: 6px;
}

.message-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}

.message-index {
  font-size: 11px;
  font-weight: 600;
  color: hsl(var(--primary));
}

.message-meta {
  font-size: 11px;
  color: hsl(var(--foreground) / 45%);
  font-family: 'SF Mono', 'Monaco', 'Menlo', monospace;
}

.message-body {
  margin: 0;
  padding: 8px;
  font-family: 'SF Mono', 'Monaco', 'Menlo', monospace;
  font-size: 12px;
  background: hsl(var(--background));
  border-radius: 4px;
  white-space: pre-wrap;
  word-break: break-all;
  color: hsl(var(--foreground) / 85%);
  max-height: 200px;
  overflow: auto;
}

.message-headers {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 6px;
}

.header-tag {
  font-size: 10px;
  padding: 1px 6px;
  background: hsl(var(--accent));
  border-radius: 3px;
  color: hsl(var(--foreground) / 60%);
  font-family: 'SF Mono', 'Monaco', 'Menlo', monospace;
}

.empty-messages {
  height: 100%;
  padding: 0;
}

/* 断言 */
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

.assertion-message {
  color: hsl(var(--foreground) / 55%);
  font-size: 12px;
}

.console-content {
  padding: 8px 0;
}
</style>
