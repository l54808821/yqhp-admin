<script setup lang="ts">
import { computed } from 'vue';

import {
  Alert,
  Badge,
  Button,
  Card,
  Descriptions,
  Space,
  Tabs,
  Tag,
} from 'ant-design-vue';

import type { StepResult } from '#/api/debug';

interface Props {
  stepResult: StepResult;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  (e: 'debug-step'): void;
}>();

// HTTP 响应数据
const httpResponse = computed(() => {
  const output = props.stepResult.output;
  if (!output) return null;

  return {
    statusCode: output.status_code || output.statusCode || 0,
    statusText: output.status || '',
    duration: props.stepResult.duration_ms || 0,
    size: output.body_raw?.length || output.body?.length || 0,
    headers: output.headers || {},
    body: output.body_raw || (typeof output.body === 'string' ? output.body : JSON.stringify(output.body, null, 2)),
    bodyType: detectBodyType(output.body_raw || output.body),
    request: output.request || null,
  };
});

// 断言结果
const assertionResults = computed(() => {
  const output = props.stepResult.output;
  if (!output?.assertions) return [];
  return output.assertions;
});

// 控制台日志
const consoleLogs = computed(() => {
  const output = props.stepResult.output;
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
function detectBodyType(body: any): string {
  if (!body) return 'text';
  const str = typeof body === 'string' ? body : JSON.stringify(body);
  if (str.startsWith('{') || str.startsWith('[')) return 'json';
  if (str.startsWith('<')) return 'xml';
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

// 格式化 JSON
function formatJson(data: any): string {
  if (typeof data === 'string') {
    try {
      return JSON.stringify(JSON.parse(data), null, 2);
    } catch {
      return data;
    }
  }
  return JSON.stringify(data, null, 2);
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
          <pre v-if="httpResponse?.bodyType === 'json'" class="json-body">{{ formatJson(httpResponse.body) }}</pre>
          <pre v-else class="text-body">{{ httpResponse?.body || '(空)' }}</pre>
        </div>
      </Tabs.TabPane>

      <!-- Headers Tab -->
      <Tabs.TabPane key="headers" tab="Headers">
        <Descriptions :column="1" size="small" bordered>
          <Descriptions.Item
            v-for="(value, key) in httpResponse?.headers"
            :key="key"
            :label="key"
          >
            {{ Array.isArray(value) ? value.join(', ') : value }}
          </Descriptions.Item>
        </Descriptions>
        <div v-if="!httpResponse?.headers || Object.keys(httpResponse.headers).length === 0" class="empty-tip">
          无响应头
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
          <Descriptions :column="1" size="small" bordered>
            <Descriptions.Item label="URL">{{ httpResponse.request.url }}</Descriptions.Item>
            <Descriptions.Item label="Method">{{ httpResponse.request.method }}</Descriptions.Item>
          </Descriptions>
          <Card size="small" title="请求头" class="request-section">
            <Descriptions :column="1" size="small">
              <Descriptions.Item
                v-for="(value, key) in httpResponse.request.headers"
                :key="key"
                :label="key"
              >
                {{ value }}
              </Descriptions.Item>
            </Descriptions>
          </Card>
          <Card v-if="httpResponse.request.body" size="small" title="请求体" class="request-section">
            <pre class="request-body">{{ httpResponse.request.body }}</pre>
          </Card>
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
  gap: 12px;
}

.status-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: #fafafa;
  border-radius: 4px;
}

.status-code {
  font-size: 14px;
  font-weight: 600;
}

.status-text {
  color: #666;
}

.divider {
  color: #d9d9d9;
}

.metric {
  font-size: 12px;
  color: #666;
}

.assertion-summary {
  padding: 8px 12px;
  background: #f5f5f5;
  border-radius: 4px;
}

.error-alert {
  margin: 0;
}

.response-tabs {
  flex: 1;
}

.body-content {
  max-height: 300px;
  overflow: auto;
}

.json-body,
.text-body {
  margin: 0;
  padding: 12px;
  background: #f5f5f5;
  border-radius: 4px;
  font-size: 12px;
  white-space: pre-wrap;
  word-break: break-all;
}

.json-body {
  background: #1e1e1e;
  color: #d4d4d4;
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
  background: #f6ffed;
  border: 1px solid #b7eb8f;
}

.assertion-item.failed {
  background: #fff2f0;
  border: 1px solid #ffccc7;
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
  color: #666;
  font-size: 12px;
}

.console-logs {
  background: #1e1e1e;
  color: #d4d4d4;
  padding: 12px;
  border-radius: 4px;
  font-family: monospace;
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
  gap: 12px;
}

.request-section {
  margin-top: 8px;
}

.request-body {
  margin: 0;
  padding: 8px;
  background: #f5f5f5;
  border-radius: 4px;
  font-size: 12px;
  white-space: pre-wrap;
  word-break: break-all;
}

.empty-tip {
  text-align: center;
  color: #999;
  padding: 20px;
}
</style>
