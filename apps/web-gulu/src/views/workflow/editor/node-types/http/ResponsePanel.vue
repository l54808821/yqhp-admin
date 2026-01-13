<script setup lang="ts">
import { ref, computed } from 'vue';

import { createIconifyIcon } from '@vben/icons';
import { Tabs, Tag, Tooltip } from 'ant-design-vue';

import type { ResponseData } from '../../types';
import CodeEditor from '../../components/CodeEditor.vue';

// 图标
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
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

async function copyToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text);
  } catch (e) {
    console.error('复制失败', e);
  }
}

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

// Headers 数量
const headersCount = computed(() => Object.keys(props.response.headers || {}).length);

// Cookies 数量
const cookiesCount = computed(() => Object.keys(props.response.cookies || {}).length);
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
        <Tabs.TabPane key="request" v-if="response.actualRequest" tab="实际请求" />
      </Tabs>

      <!-- 右侧状态信息 -->
      <div class="response-meta">
        <Tag :color="statusColor" class="status-tag">
          {{ response.statusCode }}
        </Tag>
        <span class="meta-item">{{ formatDuration(response.duration) }}</span>
        <span class="meta-item">{{ formatSize(response.size) }}</span>
        <Tooltip title="复制">
          <button class="copy-btn" @click="copyToClipboard(response.body)">
            <CopyIcon class="size-3.5" />
          </button>
        </Tooltip>
      </div>
    </div>

    <!-- 内容区域 -->
    <div class="response-content">
      <!-- Body -->
      <div v-if="activeTab === 'body'" class="tab-content">
        <CodeEditor
          :model-value="formattedBody"
          :language="bodyLanguage"
          :readonly="true"
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
}

.response-tabs :deep(.ant-tabs-nav::before) {
  display: none;
}

.response-tabs :deep(.ant-tabs-tab) {
  padding: 8px 12px;
  font-size: 12px;
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

.copy-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: hsl(var(--foreground) / 45%);
  cursor: pointer;
  transition: all 0.15s;
}

.copy-btn:hover {
  background: hsl(var(--accent));
  color: hsl(var(--foreground));
}

/* 内容区域 */
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
