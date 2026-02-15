<script setup lang="ts">
/**
 * 统一的 HTTP 响应面板组件
 * 同时用于单步调试和流程调试的响应展示
 */
import { ref, computed } from 'vue';

import { createIconifyIcon } from '@vben/icons';
import { Badge, Tabs, Tag } from 'ant-design-vue';

import { ResponseBodyEditor } from '#/components/code-editor';

import type { HttpResponseData } from './types';
import ConsoleLogPanel from './ConsoleLogPanel.vue';

const CheckCircleIcon = createIconifyIcon('lucide:check-circle');
const XCircleIcon = createIconifyIcon('lucide:x-circle');

interface Props {
  response: HttpResponseData;
}

const props = defineProps<Props>();

const activeTab = ref('body');

// 是否为请求错误（未收到响应，如 DNS 解析失败、连接超时等）
const isRequestError = computed(() => {
  return props.response.statusCode === 0 && !!props.response.error;
});

// 状态码显示文本：请求错误时显示 statusText（如 "Error"），否则显示数字状态码
const statusDisplay = computed(() => {
  if (isRequestError.value) {
    return props.response.statusText || 'Error';
  }
  return props.response.statusCode;
});

// 状态码颜色
const statusColor = computed(() => {
  const code = props.response.statusCode;
  if (isRequestError.value) return '#ff4d4f';
  if (code >= 200 && code < 300) return '#52c41a';
  if (code >= 300 && code < 400) return '#faad14';
  if (code >= 400 && code < 500) return '#ff4d4f';
  if (code >= 500) return '#ff4d4f';
  return '#666';
});

function formatSize(bytes: number): string {
  if (bytes == null || Number.isNaN(bytes)) return '-';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

// 检测 body 类型
const detectedBodyType = computed(() => {
  if (props.response.bodyType) return props.response.bodyType;
  const body = props.response.body;
  if (!body) return 'text';
  if (body.startsWith('{') || body.startsWith('[')) return 'json';
  if (body.startsWith('<?xml') || body.startsWith('<')) {
    if (body.includes('<!DOCTYPE html') || body.includes('<html')) return 'html';
    return 'xml';
  }
  return 'text';
});

// Headers 数量
const headersCount = computed(() => Object.keys(props.response.headers || {}).length);

// Cookies 数量
const cookiesCount = computed(() => Object.keys(props.response.cookies || {}).length);

// 是否有控制台输出
const hasConsoleOutput = computed(() => {
  return props.response.consoleLogs && props.response.consoleLogs.length > 0;
});

// 控制台日志总数
const consoleLogsCount = computed(() => {
  return props.response.consoleLogs?.length || 0;
});

// 断言结果
const assertionResults = computed(() => props.response.assertions || []);
const hasAssertions = computed(() => assertionResults.value.length > 0);
const passedAssertions = computed(() => assertionResults.value.filter(a => a.passed).length);
const failedAssertions = computed(() => assertionResults.value.filter(a => !a.passed).length);

// 格式化 header 值
function formatHeaderValue(value: string | string[]): string {
  return Array.isArray(value) ? value.join(', ') : value;
}
</script>

<template>
  <div class="http-response-panel">
    <!-- 状态栏 -->
    <div class="response-header">
      <Tabs v-model:activeKey="activeTab" size="small" class="response-tabs">
        <Tabs.TabPane key="body" tab="Body" />
        <Tabs.TabPane key="headers">
          <template #tab>
            <span>Headers</span>
            <span v-if="headersCount > 0" class="tab-count">{{ headersCount }}</span>
          </template>
        </Tabs.TabPane>
        <Tabs.TabPane key="cookies" v-if="cookiesCount > 0">
          <template #tab>
            <span>Cookies</span>
            <span class="tab-count">{{ cookiesCount }}</span>
          </template>
        </Tabs.TabPane>
        <Tabs.TabPane key="assertions" v-if="hasAssertions" tab="断言" />
        <Tabs.TabPane key="console" v-if="hasConsoleOutput">
          <template #tab>
            <span>控制台</span>
            <span v-if="consoleLogsCount > 0" class="tab-count">{{ consoleLogsCount }}</span>
          </template>
        </Tabs.TabPane>
        <Tabs.TabPane key="request" v-if="response.actualRequest" tab="实际请求" />
      </Tabs>

      <!-- 右侧状态信息 -->
      <div class="response-meta">
        <Tag :color="statusColor" class="status-tag">
          {{ statusDisplay }}
        </Tag>
        <span class="meta-item">{{ formatDuration(response.duration) }}</span>
        <span v-if="!isRequestError" class="meta-item">{{ formatSize(response.size) }}</span>
      </div>
    </div>

    <!-- 内容区域 -->
    <div class="response-content">
      <!-- Body -->
      <div v-if="activeTab === 'body'" class="tab-content">
        <ResponseBodyEditor
          :body="response.body"
          :body-type="detectedBodyType"
          height="100%"
        />
      </div>

      <!-- Headers -->
      <div v-else-if="activeTab === 'headers'" class="tab-content">
        <div class="kv-list">
          <div
            v-for="(value, key) in response.headers"
            :key="key"
            class="kv-item"
          >
            <span class="kv-key">{{ key }}</span>
            <span class="kv-value">{{ formatHeaderValue(value) }}</span>
          </div>
          <div v-if="headersCount === 0" class="empty-hint">无 Headers</div>
        </div>
      </div>

      <!-- Cookies -->
      <div v-else-if="activeTab === 'cookies'" class="tab-content">
        <div class="kv-list">
          <div
            v-for="(value, key) in response.cookies"
            :key="key"
            class="kv-item"
          >
            <span class="kv-key">{{ key }}</span>
            <span class="kv-value">{{ value }}</span>
          </div>
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

      <!-- 实际请求 -->
      <div v-else-if="activeTab === 'request' && response.actualRequest" class="tab-content">
        <div class="actual-request">
          <div class="request-line">
            <span class="request-method">{{ response.actualRequest.method }}</span>
            <span class="request-url">{{ response.actualRequest.url }}</span>
          </div>
          <div v-if="Object.keys(response.actualRequest.headers || {}).length > 0" class="request-section">
            <div class="section-title">请求头</div>
            <div class="kv-list">
              <div
                v-for="(value, key) in response.actualRequest.headers"
                :key="key"
                class="kv-item"
              >
                <span class="kv-key">{{ key }}</span>
                <span class="kv-value">{{ value }}</span>
              </div>
            </div>
          </div>
          <div v-if="response.actualRequest.body" class="request-section">
            <div class="section-title">请求体</div>
            <pre class="body-pre">{{ response.actualRequest.body }}</pre>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.http-response-panel {
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

.response-content {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.tab-content {
  height: 100%;
  overflow: auto;
}

/* KV 列表 */
.kv-list {
  display: flex;
  flex-direction: column;
}

.kv-item {
  display: flex;
  gap: 12px;
  padding: 6px 12px;
  font-size: 12px;
  border-bottom: 1px solid hsl(var(--border) / 30%);
}

.kv-item:hover {
  background: hsl(var(--accent) / 30%);
}

.kv-key {
  min-width: 160px;
  font-weight: 500;
  color: hsl(var(--foreground) / 75%);
}

.kv-value {
  flex: 1;
  color: hsl(var(--foreground) / 55%);
  word-break: break-all;
  font-family: 'SF Mono', 'Monaco', 'Menlo', monospace;
}

.empty-hint {
  padding: 24px;
  text-align: center;
  color: hsl(var(--foreground) / 35%);
  font-size: 12px;
}

/* 断言 */
.assertion-summary {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: hsl(var(--accent) / 30%);
  border-radius: 4px;
  margin-bottom: 12px;
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

/* 控制台样式 */
.console-content {
  padding: 8px 0;
}

/* 实际请求 */
.actual-request {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 12px;
}

.request-line {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: hsl(var(--accent) / 50%);
  border-radius: 4px;
}

.request-method {
  font-weight: 600;
  font-size: 12px;
  color: #61affe;
}

.request-url {
  font-family: 'SF Mono', 'Monaco', 'Menlo', monospace;
  font-size: 12px;
  color: hsl(var(--foreground) / 75%);
  word-break: break-all;
}

.request-section {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.section-title {
  font-size: 12px;
  font-weight: 500;
  color: hsl(var(--foreground) / 60%);
  padding-left: 4px;
}

.body-pre {
  margin: 0;
  padding: 8px 12px;
  font-family: 'SF Mono', 'Monaco', 'Menlo', monospace;
  font-size: 12px;
  background: hsl(var(--accent) / 50%);
  border-radius: 4px;
  white-space: pre-wrap;
  word-break: break-all;
}
</style>
