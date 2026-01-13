<script setup lang="ts">
import { ref, computed } from 'vue';

import { createIconifyIcon } from '@vben/icons';
import { Badge, Tabs, Tag, Tooltip } from 'ant-design-vue';

import type { ResponseData } from '../../types';
import CodeEditor from '../../components/CodeEditor.vue';

// 图标
const CheckCircleIcon = createIconifyIcon('lucide:check-circle');
const XCircleIcon = createIconifyIcon('lucide:x-circle');
const CopyIcon = createIconifyIcon('lucide:copy');

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
  if (ms < 1000) return `${ms} ms`;
  return `${(ms / 1000).toFixed(2)} s`;
}

async function copyToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text);
  } catch (e) {
    console.error('复制失败', e);
  }
}

const assertionStats = computed(() => {
  const assertions = props.response.assertions || [];
  const passed = assertions.filter(a => a.passed).length;
  const failed = assertions.length - passed;
  return { total: assertions.length, passed, failed };
});

// 响应体编辑器语言
const bodyLanguage = computed(() => {
  switch (props.response.bodyType) {
    case 'json':
      return 'json';
    case 'xml':
      return 'xml';
    case 'html':
      return 'html';
    default:
      return 'plaintext';
  }
});

// 格式化后的响应体
const formattedBody = computed(() => {
  if (props.response.bodyType === 'json') {
    try {
      return JSON.stringify(JSON.parse(props.response.body), null, 2);
    } catch {
      return props.response.body;
    }
  }
  return props.response.body;
});
</script>

<template>
  <div class="response-panel">
    <!-- 响应头部 -->
    <div class="response-header">
      <div class="response-title">返回响应</div>

      <div class="response-meta">
        <Tag :color="statusColor" class="status-tag">
          {{ response.statusCode }} {{ response.statusText }}
        </Tag>
        <span class="meta-item">{{ formatDuration(response.duration) }}</span>
        <span class="meta-divider">|</span>
        <span class="meta-item">{{ formatSize(response.size) }}</span>
      </div>

      <!-- 断言统计 -->
      <div v-if="assertionStats.total > 0" class="assertion-stats">
        <Badge
          :count="assertionStats.passed"
          :number-style="{ backgroundColor: '#52c41a' }"
          :show-zero="true"
        >
          <span class="stats-label">通过</span>
        </Badge>
        <Badge
          :count="assertionStats.failed"
          :number-style="{ backgroundColor: '#ff4d4f' }"
          :show-zero="true"
        >
          <span class="stats-label">失败</span>
        </Badge>
      </div>

      <div class="response-actions">
        <Tooltip title="复制响应体">
          <button class="action-btn" @click="copyToClipboard(response.body)">
            <CopyIcon class="size-4" />
          </button>
        </Tooltip>
      </div>
    </div>

    <!-- 响应内容 -->
    <Tabs v-model:activeKey="activeTab" size="small" class="response-tabs">
      <Tabs.TabPane key="body" tab="Body">
        <div class="response-body">
          <CodeEditor
            :model-value="formattedBody"
            :language="bodyLanguage"
            :readonly="true"
            height="100%"
          />
        </div>
      </Tabs.TabPane>

      <Tabs.TabPane key="headers">
        <template #tab>
          <span>Headers</span>
          <span class="tab-badge">{{ Object.keys(response.headers).length }}</span>
        </template>
        <div class="kv-list">
          <div
            v-for="(value, key) in response.headers"
            :key="key"
            class="kv-item"
          >
            <span class="kv-key">{{ key }}</span>
            <span class="kv-value">{{ value }}</span>
          </div>
        </div>
      </Tabs.TabPane>

      <Tabs.TabPane key="cookies">
        <template #tab>
          <span>Cookies</span>
          <span class="tab-badge">{{ Object.keys(response.cookies).length }}</span>
        </template>
        <div class="kv-list">
          <div
            v-for="(value, key) in response.cookies"
            :key="key"
            class="kv-item"
          >
            <span class="kv-key">{{ key }}</span>
            <span class="kv-value">{{ value }}</span>
          </div>
          <div v-if="Object.keys(response.cookies).length === 0" class="empty-hint">
            无 Cookie
          </div>
        </div>
      </Tabs.TabPane>

      <Tabs.TabPane key="assertions" v-if="response.assertions?.length">
        <template #tab>
          <span>断言</span>
          <span
            class="tab-badge"
            :class="{ failed: assertionStats.failed > 0 }"
          >
            {{ assertionStats.passed }}/{{ assertionStats.total }}
          </span>
        </template>
        <div class="assertion-list">
          <div
            v-for="assertion in response.assertions"
            :key="assertion.id"
            class="assertion-item"
            :class="{ passed: assertion.passed, failed: !assertion.passed }"
          >
            <component
              :is="assertion.passed ? CheckCircleIcon : XCircleIcon"
              class="assertion-icon size-4"
            />
            <div class="assertion-info">
              <span class="assertion-name">{{ assertion.name }}</span>
              <span v-if="assertion.message" class="assertion-message">
                {{ assertion.message }}
              </span>
            </div>
          </div>
        </div>
      </Tabs.TabPane>

      <Tabs.TabPane key="console" v-if="response.console?.length">
        <template #tab>
          <span>控制台</span>
          <span class="tab-badge">{{ response.console.length }}</span>
        </template>
        <div class="console-output">
          <div v-for="(log, index) in response.console" :key="index" class="console-line">
            {{ log }}
          </div>
        </div>
      </Tabs.TabPane>

      <Tabs.TabPane key="request" v-if="response.actualRequest">
        <template #tab>实际请求</template>
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
            <pre class="body-content">{{ response.actualRequest.body }}</pre>
          </div>
        </div>
      </Tabs.TabPane>
    </Tabs>
  </div>
</template>

<style scoped>
.response-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

.response-header {
  display: flex;
  align-items: center;
  gap: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid hsl(var(--border));
  flex-shrink: 0;
}

.response-title {
  font-size: 14px;
  font-weight: 600;
  color: hsl(var(--foreground));
}

.response-meta {
  display: flex;
  align-items: center;
  gap: 10px;
}

.status-tag {
  font-weight: 600;
  border-radius: 4px;
  margin: 0;
}

.meta-item {
  font-size: 12px;
  color: hsl(var(--foreground) / 60%);
}

.meta-divider {
  color: hsl(var(--foreground) / 20%);
}

.assertion-stats {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-left: auto;
}

.stats-label {
  padding: 2px 8px;
  font-size: 12px;
  color: hsl(var(--foreground) / 60%);
}

.response-actions {
  display: flex;
  gap: 4px;
}

.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: hsl(var(--foreground) / 50%);
  cursor: pointer;
  transition: all 0.2s;
}

.action-btn:hover {
  background: hsl(var(--accent));
  color: hsl(var(--foreground));
}

.response-tabs {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
}

.response-tabs :deep(.ant-tabs-nav) {
  margin: 0;
  margin-top: 8px;
}

.response-tabs :deep(.ant-tabs-nav::before) {
  display: none;
}

.response-tabs :deep(.ant-tabs-tab) {
  padding: 8px 4px;
  font-size: 12px;
}

.response-tabs :deep(.ant-tabs-content-holder) {
  flex: 1;
  overflow: hidden;
}

.response-tabs :deep(.ant-tabs-content) {
  height: 100%;
}

.response-tabs :deep(.ant-tabs-tabpane) {
  height: 100%;
  padding-top: 8px;
  overflow-y: auto;
}

.tab-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 16px;
  height: 16px;
  padding: 0 5px;
  margin-left: 4px;
  font-size: 10px;
  font-weight: 500;
  color: hsl(var(--primary));
  background: hsl(var(--primary) / 12%);
  border-radius: 8px;
}

.tab-badge.failed {
  color: #ff4d4f;
  background: rgba(255, 77, 79, 0.12);
}

.response-body {
  height: 100%;
  min-height: 200px;
}

.body-content {
  margin: 0;
  padding: 12px;
  font-family: 'SF Mono', 'Monaco', 'Menlo', monospace;
  font-size: 12px;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-all;
  background: hsl(var(--accent) / 50%);
  border-radius: 6px;
  color: hsl(var(--foreground) / 85%);
}

.kv-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.kv-item {
  display: flex;
  gap: 12px;
  padding: 6px 8px;
  font-size: 12px;
  border-radius: 4px;
}

.kv-item:hover {
  background: hsl(var(--accent) / 50%);
}

.kv-key {
  min-width: 140px;
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
  font-size: 13px;
}

.assertion-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.assertion-item {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 6px;
  background: hsl(var(--accent) / 30%);
}

.assertion-item.passed .assertion-icon {
  color: #52c41a;
}

.assertion-item.failed .assertion-icon {
  color: #ff4d4f;
}

.assertion-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.assertion-name {
  font-size: 13px;
  font-weight: 500;
}

.assertion-message {
  font-size: 12px;
  color: hsl(var(--foreground) / 55%);
}

.console-output {
  padding: 12px;
  font-family: 'SF Mono', 'Monaco', 'Menlo', monospace;
  font-size: 12px;
  background: hsl(var(--accent) / 50%);
  border-radius: 6px;
}

.console-line {
  line-height: 1.6;
  color: hsl(var(--foreground) / 75%);
}

.actual-request {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.request-line {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: hsl(var(--accent) / 50%);
  border-radius: 6px;
}

.request-method {
  font-weight: 600;
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
  gap: 6px;
}

.section-title {
  font-size: 12px;
  font-weight: 500;
  color: hsl(var(--foreground) / 60%);
}
</style>
