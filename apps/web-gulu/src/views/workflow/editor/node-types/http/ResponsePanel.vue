<script setup lang="ts">
import { ref, computed } from 'vue';

import { createIconifyIcon } from '@vben/icons';
import { Tabs, Tag } from 'ant-design-vue';

import type { ResponseData } from '../../types';
import { ResponseBodyEditor } from '#/components/code-editor';

const CheckCircleIcon = createIconifyIcon('lucide:check-circle');
const XCircleIcon = createIconifyIcon('lucide:x-circle');

interface Props {
  response: ResponseData;
}

const props = defineProps<Props>();

const activeTab = ref('body');

// 状态码颜色
const statusColor = computed(() => {
  const code = props.response.statusCode;
  if (code >= 200 && code < 300) return '#52c41a';
  if (code >= 300 && code < 400) return '#faad14';
  if (code >= 400 && code < 500) return '#ff4d4f';
  if (code >= 500) return '#ff4d4f';
  return '#666';
});

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

// Headers 数量
const headersCount = computed(() => Object.keys(props.response.headers || {}).length);

// Cookies 数量
const cookiesCount = computed(() => Object.keys(props.response.cookies || {}).length);

// 是否有控制台输出
const hasConsoleOutput = computed(() => {
  const hasConsoleLogs = props.response.console && props.response.console.length > 0;
  const hasPreResults = props.response.preProcessorResults && props.response.preProcessorResults.length > 0;
  const hasPostResults = props.response.postProcessorResults && props.response.postProcessorResults.length > 0;
  return hasConsoleLogs || hasPreResults || hasPostResults;
});

// 控制台日志总数
const consoleLogsCount = computed(() => {
  let count = 0;
  if (props.response.console) count += props.response.console.length;
  if (props.response.preProcessorResults) {
    props.response.preProcessorResults.forEach(r => {
      if (r.logs) count += r.logs.length;
    });
  }
  if (props.response.postProcessorResults) {
    props.response.postProcessorResults.forEach(r => {
      if (r.logs) count += r.logs.length;
    });
  }
  return count;
});

// 获取处理器类型名称
function getProcessorTypeName(type: string): string {
  const names: Record<string, string> = {
    'js_script': 'JS 脚本',
    'set_variable': '设置变量',
    'db_query': '数据库查询',
    'wait': '等待',
    'assertion': '断言',
    'extract_param': '提取参数',
  };
  return names[type] || type;
}
</script>

<template>
  <div class="response-panel">
    <!-- Apifox 风格：Tab + 状态信息在同一行 -->
    <div class="response-header">
      <Tabs v-model:activeKey="activeTab" size="small" class="response-tabs">
        <Tabs.TabPane key="body" tab="Body" />
        <Tabs.TabPane key="headers">
          <template #tab>
            <span>Headers</span>
            <span class="tab-count">{{ headersCount }}</span>
          </template>
        </Tabs.TabPane>
        <Tabs.TabPane key="cookies">
          <template #tab>
            <span>Cookies</span>
            <span class="tab-count">{{ cookiesCount }}</span>
          </template>
        </Tabs.TabPane>
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
          {{ response.statusCode }}
        </Tag>
        <span class="meta-item">{{ formatDuration(response.duration) }}</span>
        <span class="meta-item">{{ formatSize(response.size) }}</span>
      </div>
    </div>

    <!-- 内容区域 -->
    <div class="response-content">
      <!-- Body -->
      <div v-if="activeTab === 'body'" class="tab-content">
        <ResponseBodyEditor
          :body="response.body"
          :body-type="response.bodyType"
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
            <span class="kv-value">{{ value }}</span>
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
          <div v-if="cookiesCount === 0" class="empty-hint">无 Cookies</div>
        </div>
      </div>

      <!-- 控制台 -->
      <div v-else-if="activeTab === 'console'" class="tab-content console-content">
        <!-- 前置处理器结果 -->
        <template v-if="response.preProcessorResults && response.preProcessorResults.length > 0">
          <div class="processor-section">
            <div class="processor-section-title">前置操作</div>
            <div
              v-for="result in response.preProcessorResults"
              :key="result.keywordId"
              class="processor-result"
            >
              <div class="processor-header">
                <component
                  :is="result.success ? CheckCircleIcon : XCircleIcon"
                  class="processor-status-icon"
                  :class="{ success: result.success, failed: !result.success }"
                />
                <span class="processor-type">{{ getProcessorTypeName(result.type) }}</span>
                <span v-if="result.name" class="processor-name">{{ result.name }}</span>
              </div>
              <div v-if="result.message" class="processor-message" :class="{ error: !result.success }">
                {{ result.message }}
              </div>
              <div v-if="result.logs && result.logs.length > 0" class="processor-logs">
                <div v-for="(log, idx) in result.logs" :key="idx" class="log-line">
                  {{ log }}
                </div>
              </div>
            </div>
          </div>
        </template>

        <!-- 通用控制台日志 -->
        <template v-if="response.console && response.console.length > 0">
          <div class="processor-section">
            <div class="processor-section-title">控制台输出</div>
            <div class="processor-logs">
              <div v-for="(log, idx) in response.console" :key="idx" class="log-line">
                {{ log }}
              </div>
            </div>
          </div>
        </template>

        <!-- 后置处理器结果 -->
        <template v-if="response.postProcessorResults && response.postProcessorResults.length > 0">
          <div class="processor-section">
            <div class="processor-section-title">后置操作</div>
            <div
              v-for="result in response.postProcessorResults"
              :key="result.keywordId"
              class="processor-result"
            >
              <div class="processor-header">
                <component
                  :is="result.success ? CheckCircleIcon : XCircleIcon"
                  class="processor-status-icon"
                  :class="{ success: result.success, failed: !result.success }"
                />
                <span class="processor-type">{{ getProcessorTypeName(result.type) }}</span>
                <span v-if="result.name" class="processor-name">{{ result.name }}</span>
              </div>
              <div v-if="result.message" class="processor-message" :class="{ error: !result.success }">
                {{ result.message }}
              </div>
              <div v-if="result.logs && result.logs.length > 0" class="processor-logs">
                <div v-for="(log, idx) in result.logs" :key="idx" class="log-line">
                  {{ log }}
                </div>
              </div>
            </div>
          </div>
        </template>

        <!-- 空状态 -->
        <div v-if="!hasConsoleOutput" class="empty-hint">无控制台输出</div>
      </div>

      <!-- 实际请求 -->
      <div v-else-if="activeTab === 'request' && response.actualRequest" class="tab-content">
        <div class="actual-request">
          <div class="request-line">
            <span class="request-method">{{ response.actualRequest.method }}</span>
            <span class="request-url">{{ response.actualRequest.url }}</span>
          </div>
          <div class="request-section">
            <div class="section-title">Headers</div>
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
            <div class="section-title">Body</div>
            <pre class="body-pre">{{ response.actualRequest.body }}</pre>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.response-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

/* Apifox 风格头部：Tab + 状态在同一行 */
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
  padding-left: 16px;
}

.response-tabs :deep(.ant-tabs-nav::before) {
  display: none;
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

/* 内容区域 */
.response-content {
  flex: 1;
  min-height: 0;
  overflow: hidden;
  padding: 0 16px 12px 16px;
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

/* 控制台样式 */
.console-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 12px 0;
}

.processor-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.processor-section-title {
  font-size: 12px;
  font-weight: 600;
  color: hsl(var(--foreground) / 70%);
  padding: 4px 0;
  border-bottom: 1px solid hsl(var(--border) / 50%);
}

.processor-result {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 8px 12px;
  background: hsl(var(--accent) / 30%);
  border-radius: 6px;
  border-left: 3px solid hsl(var(--border));
}

.processor-result:has(.processor-status-icon.success) {
  border-left-color: #52c41a;
}

.processor-result:has(.processor-status-icon.failed) {
  border-left-color: #ff4d4f;
}

.processor-header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.processor-status-icon {
  width: 14px;
  height: 14px;
}

.processor-status-icon.success {
  color: #52c41a;
}

.processor-status-icon.failed {
  color: #ff4d4f;
}

.processor-type {
  font-size: 12px;
  font-weight: 500;
  color: hsl(var(--foreground) / 80%);
}

.processor-name {
  font-size: 12px;
  color: hsl(var(--foreground) / 55%);
}

.processor-message {
  font-size: 12px;
  color: hsl(var(--foreground) / 70%);
  padding-left: 22px;
}

.processor-message.error {
  color: #ff4d4f;
}

.processor-logs {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 8px;
  margin-top: 4px;
  background: hsl(var(--background));
  border-radius: 4px;
  font-family: 'SF Mono', 'Monaco', 'Menlo', monospace;
  font-size: 11px;
  max-height: 200px;
  overflow-y: auto;
}

.log-line {
  color: hsl(var(--foreground) / 75%);
  white-space: pre-wrap;
  word-break: break-all;
  line-height: 1.5;
}

.log-line::before {
  content: '>';
  margin-right: 8px;
  color: hsl(var(--foreground) / 40%);
}
</style>
