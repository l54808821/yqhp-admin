<script setup lang="ts">
import { computed } from 'vue';

import {
  Alert,
  Badge,
  Button,
  Space,
  Tabs,
  Tag,
} from 'ant-design-vue';

import type { StepResult } from '#/api/debug';
import { ResponseBodyEditor } from '#/components/code-editor';

// HTTP 输出类型定义
interface HttpOutput {
  status_code?: number;
  statusCode?: number;
  status?: string;
  body_raw?: string;
  body?: unknown;
  headers?: Record<string, string | string[]>;
  cookies?: Record<string, string>;
  request?: {
    method: string;
    url: string;
    headers?: Record<string, string>;
    body?: string;
  };
  assertions?: Array<{
    name: string;
    passed: boolean;
    message?: string;
  }>;
  console_logs?: string[];
}

interface Props {
  stepResult: StepResult;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  (e: 'debug-step'): void;
}>();

// HTTP 响应数据
const httpResponse = computed(() => {
  const output = props.stepResult.output as HttpOutput | undefined;
  if (!output) return null;

  const bodyRaw = output.body_raw;
  const body = output.body;
  const bodyStr = bodyRaw || (typeof body === 'string' ? body : JSON.stringify(body, null, 2)) || '';

  return {
    statusCode: output.status_code || output.statusCode || 0,
    statusText: output.status || '',
    duration: props.stepResult.duration_ms || 0,
    size: typeof bodyStr === 'string' ? bodyStr.length : 0,
    headers: output.headers || {},
    body: bodyStr,
    bodyType: detectBodyType(bodyStr) as 'json' | 'xml' | 'html' | 'text',
    request: output.request || null,
  };
});

// 断言结果
const assertionResults = computed(() => {
  const output = props.stepResult.output as HttpOutput | undefined;
  if (!output?.assertions) return [];
  return output.assertions;
});

// 控制台日志
const consoleLogs = computed(() => {
  const output = props.stepResult.output as HttpOutput | undefined;
  if (!output?.console_logs) return props.stepResult.logs || [];
  return output.console_logs;
});

// 状态码颜色
const statusCodeColor = computed(() => {
  const code = httpResponse.value?.statusCode || 0;
  if (code >= 200 && code < 300) return 'success';
  if (code >= 300 && code < 400) return 'warning';
  if (code >= 400) return 'error';
  return 'default';
});

// 检测响应体类型
function detectBodyType(body: unknown): string {
  if (!body) return 'text';
  const str = typeof body === 'string' ? body : JSON.stringify(body);
  if (str.startsWith('{') || str.startsWith('[')) return 'json';
  if (str.startsWith('<?xml') || str.startsWith('<')) {
    if (str.includes('<!DOCTYPE html') || str.includes('<html')) return 'html';
    return 'xml';
  }
  return 'text';
}

// 格式化大小
function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

// 格式化时长
function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms} ms`;
  return `${(ms / 1000).toFixed(2)} s`;
}

// 调试此步骤
function handleDebugStep() {
  emit('debug-step');
}
</script>

<template>
  <div class="http-step-detail">
    <!-- 状态栏 -->
    <div class="status-bar">
      <Space>
        <Tag :color="statusCodeColor" class="status-code">
          {{ httpResponse?.statusCode || '-' }}
        </Tag>
        <span class="status-text">{{ httpResponse?.statusText }}</span>
        <span class="divider">|</span>
        <span class="metric">耗时: {{ formatDuration(httpResponse?.duration || 0) }}</span>
        <span class="divider">|</span>
        <span class="metric">大小: {{ formatSize(httpResponse?.size || 0) }}</span>
      </Space>
      <Button type="primary" size="small" @click="handleDebugStep">
        调试此步骤
      </Button>
    </div>

    <!-- 断言结果 -->
    <div v-if="assertionResults.length > 0" class="assertion-summary">
      <Space>
        <Badge
          :count="assertionResults.filter(a => a.passed).length"
          :number-style="{ backgroundColor: '#52c41a' }"
        />
        <span>通过</span>
        <Badge
          :count="assertionResults.filter(a => !a.passed).length"
          :number-style="{ backgroundColor: '#ff4d4f' }"
        />
        <span>失败</span>
      </Space>
    </div>

    <!-- 错误信息 -->
    <Alert
      v-if="stepResult.error"
      type="error"
      :message="stepResult.error"
      class="error-alert"
    />

    <!-- Tab 内容 -->
    <Tabs class="response-tabs">
      <!-- Body Tab -->
      <Tabs.TabPane key="body" tab="Body">
        <div class="body-content">
          <ResponseBodyEditor
            v-if="httpResponse"
            :body="httpResponse.body"
            :body-type="httpResponse.bodyType"
            height="300px"
          />
          <div v-else class="empty-tip">无响应体</div>
        </div>
      </Tabs.TabPane>

      <!-- Headers Tab -->
      <Tabs.TabPane key="headers" tab="Headers">
        <div class="kv-list">
          <div
            v-for="(value, key) in httpResponse?.headers"
            :key="key"
            class="kv-item"
          >
            <span class="kv-key">{{ key }}</span>
            <span class="kv-value">{{ Array.isArray(value) ? value.join(', ') : value }}</span>
          </div>
          <div v-if="!httpResponse?.headers || Object.keys(httpResponse.headers).length === 0" class="empty-tip">
            无响应头
          </div>
        </div>
      </Tabs.TabPane>

      <!-- 断言 Tab -->
      <Tabs.TabPane key="assertions" tab="断言">
        <div v-if="assertionResults.length > 0" class="assertion-list">
          <div
            v-for="(assertion, idx) in assertionResults"
            :key="idx"
            class="assertion-item"
            :class="{ passed: assertion.passed, failed: !assertion.passed }"
          >
            <span class="assertion-icon">{{ assertion.passed ? '✓' : '✗' }}</span>
            <span class="assertion-name">{{ assertion.name }}</span>
            <span v-if="assertion.message" class="assertion-message">{{ assertion.message }}</span>
          </div>
        </div>
        <div v-else class="empty-tip">无断言</div>
      </Tabs.TabPane>

      <!-- 控制台 Tab -->
      <Tabs.TabPane key="console" tab="控制台">
        <div v-if="consoleLogs.length > 0" class="console-logs">
          <div v-for="(log, idx) in consoleLogs" :key="idx" class="log-line">{{ log }}</div>
        </div>
        <div v-else class="empty-tip">无日志</div>
      </Tabs.TabPane>

      <!-- 实际请求 Tab -->
      <Tabs.TabPane key="request" tab="实际请求">
        <div v-if="httpResponse?.request" class="actual-request">
          <div class="request-line">
            <span class="request-method">{{ httpResponse.request.method }}</span>
            <span class="request-url">{{ httpResponse.request.url }}</span>
          </div>
          <div v-if="httpResponse.request.headers && Object.keys(httpResponse.request.headers).length > 0" class="request-section">
            <div class="section-title">请求头</div>
            <div class="kv-list">
              <div
                v-for="(value, key) in httpResponse.request.headers"
                :key="key"
                class="kv-item"
              >
                <span class="kv-key">{{ key }}</span>
                <span class="kv-value">{{ value }}</span>
              </div>
            </div>
          </div>
          <div v-if="httpResponse.request.body" class="request-section">
            <div class="section-title">请求体</div>
            <pre class="request-body">{{ httpResponse.request.body }}</pre>
          </div>
        </div>
        <div v-else class="empty-tip">无请求信息</div>
      </Tabs.TabPane>
    </Tabs>
  </div>
</template>

<style scoped>
.http-step-detail {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.status-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: hsl(var(--accent) / 50%);
  border-radius: 4px;
}

.status-code {
  font-size: 14px;
  font-weight: 600;
}

.status-text {
  color: hsl(var(--foreground) / 65%);
}

.divider {
  color: hsl(var(--border));
}

.metric {
  font-size: 12px;
  color: hsl(var(--foreground) / 65%);
}

.assertion-summary {
  padding: 8px 12px;
  background: hsl(var(--accent) / 30%);
  border-radius: 4px;
}

.error-alert {
  margin: 0;
}

.response-tabs {
  flex: 1;
}

/* 减少 Tab 间距 */
.response-tabs :deep(.ant-tabs-nav) {
  margin-bottom: 8px;
}

.response-tabs :deep(.ant-tabs-tab) {
  padding: 6px 0;
  font-size: 13px;
}

.response-tabs :deep(.ant-tabs-tab + .ant-tabs-tab) {
  margin-left: 20px;
}

.body-content {
  height: 300px;
}

/* KV 列表样式 */
.kv-list {
  display: flex;
  flex-direction: column;
}

.kv-item {
  display: flex;
  gap: 12px;
  padding: 8px 12px;
  font-size: 13px;
  border-bottom: 1px solid hsl(var(--border) / 30%);
}

.kv-item:hover {
  background: hsl(var(--accent) / 30%);
}

.kv-key {
  min-width: 140px;
  font-weight: 500;
  color: hsl(var(--foreground) / 75%);
}

.kv-value {
  flex: 1;
  color: hsl(var(--foreground) / 65%);
  word-break: break-all;
  font-family: 'SF Mono', 'Monaco', 'Menlo', monospace;
}

.assertion-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
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
  font-weight: bold;
}

.assertion-item.passed .assertion-icon {
  color: #52c41a;
}

.assertion-item.failed .assertion-icon {
  color: #ff4d4f;
}

.assertion-name {
  font-weight: 500;
}

.assertion-message {
  color: hsl(var(--foreground) / 55%);
  font-size: 12px;
}

.console-logs {
  background: hsl(var(--accent) / 50%);
  color: hsl(var(--foreground) / 75%);
  padding: 12px;
  border-radius: 4px;
  font-family: 'SF Mono', 'Monaco', 'Menlo', monospace;
  font-size: 12px;
  max-height: 200px;
  overflow: auto;
}

.log-line {
  white-space: pre-wrap;
  word-break: break-all;
}

.actual-request {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.request-line {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  background: hsl(var(--accent) / 50%);
  border-radius: 6px;
}

.request-method {
  font-weight: 600;
  font-size: 13px;
  color: #61affe;
}

.request-url {
  font-family: 'SF Mono', 'Monaco', 'Menlo', monospace;
  font-size: 13px;
  color: hsl(var(--foreground) / 75%);
  word-break: break-all;
}

.request-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.section-title {
  font-size: 13px;
  font-weight: 500;
  color: hsl(var(--foreground) / 70%);
  padding-left: 4px;
}

.request-body {
  margin: 0;
  padding: 12px;
  background: hsl(var(--accent) / 50%);
  border-radius: 6px;
  font-family: 'SF Mono', 'Monaco', 'Menlo', monospace;
  font-size: 12px;
  white-space: pre-wrap;
  word-break: break-all;
  color: hsl(var(--foreground) / 75%);
}

.empty-tip {
  text-align: center;
  color: hsl(var(--foreground) / 45%);
  padding: 20px;
}
</style>
