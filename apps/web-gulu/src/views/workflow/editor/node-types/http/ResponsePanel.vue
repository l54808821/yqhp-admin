<script setup lang="ts">
import { ref, computed } from 'vue';

import { createIconifyIcon } from '@vben/icons';
import { Badge, Tabs, Tag, Tooltip } from 'ant-design-vue';

import type { ResponseData } from '../../types';

// 图标
const CheckCircleIcon = createIconifyIcon('lucide:check-circle');
const XCircleIcon = createIconifyIcon('lucide:x-circle');
const CopyIcon = createIconifyIcon('lucide:copy');
// const DownloadIcon = createIconifyIcon('lucide:download');

interface Props {
  response: ResponseData;
}

const props = defineProps<Props>();

// 当前 Tab
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

// 格式化大小
function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

// 格式化耗时
function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms} ms`;
  return `${(ms / 1000).toFixed(2)} s`;
}

// 格式化 JSON
function formatJson(str: string): string {
  try {
    return JSON.stringify(JSON.parse(str), null, 2);
  } catch {
    return str;
  }
}

// 复制到剪贴板
async function copyToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text);
  } catch (e) {
    console.error('复制失败', e);
  }
}

// 断言统计
const assertionStats = computed(() => {
  const assertions = props.response.assertions || [];
  const passed = assertions.filter(a => a.passed).length;
  const failed = assertions.length - passed;
  return { total: assertions.length, passed, failed };
});
</script>

<template>
  <div class="response-panel">
    <!-- 响应头部信息 -->
    <div class="response-header">
      <div class="response-status">
        <Tag :color="statusColor" class="status-tag">
          {{ response.statusCode }} {{ response.statusText }}
        </Tag>
        <span class="response-meta">
          <span class="meta-item">{{ formatDuration(response.duration) }}</span>
          <span class="meta-divider">|</span>
          <span class="meta-item">{{ formatSize(response.size) }}</span>
        </span>
      </div>

      <!-- 断言结果统计 -->
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

      <!-- 工具按钮 -->
      <div class="response-actions">
        <Tooltip title="复制响应体">
          <button class="action-btn" @click="copyToClipboard(response.body)">
            <CopyIcon class="size-4" />
          </button>
        </Tooltip>
      </div>
    </div>

    <!-- 响应内容 Tabs -->
    <Tabs v-model:activeKey="activeTab" size="small" class="response-tabs">
      <Tabs.TabPane key="body" tab="Body">
        <div class="response-body">
          <pre v-if="response.bodyType === 'json'" class="body-content json">{{
            formatJson(response.body)
          }}</pre>
          <pre v-else class="body-content">{{ response.body }}</pre>
        </div>
      </Tabs.TabPane>

      <Tabs.TabPane key="headers">
        <template #tab>
          <span>Headers</span>
          <span class="tab-count">{{ Object.keys(response.headers).length }}</span>
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
          <span class="tab-count">{{ Object.keys(response.cookies).length }}</span>
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
            class="tab-count"
            :class="{ 'has-failed': assertionStats.failed > 0 }"
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
          <span class="tab-count">{{ response.console.length }}</span>
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
  max-height: 400px;
}

.response-header {
  display: flex;
  align-items: center;
  gap: 16px;
  padding-bottom: 12px;
}

.response-status {
  display: flex;
  align-items: center;
  gap: 12px;
}

.status-tag {
  font-weight: 600;
  border-radius: 4px;
}

.response-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: hsl(var(--foreground) / 70%);
}

.meta-divider {
  color: hsl(var(--foreground) / 30%);
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
  color: hsl(var(--foreground) / 60%);
  cursor: pointer;
  transition: all 0.2s;
}

.action-btn:hover {
  background: hsl(var(--accent));
  color: hsl(var(--foreground));
}

.response-tabs {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.response-tabs :deep(.ant-tabs-content) {
  height: calc(100% - 40px);
  overflow-y: auto;
}

.tab-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  height: 18px;
  padding: 0 6px;
  margin-left: 6px;
  font-size: 11px;
  font-weight: 500;
  color: hsl(var(--primary));
  background: hsl(var(--primary) / 15%);
  border-radius: 9px;
}

.tab-count.has-failed {
  color: #ff4d4f;
  background: rgba(255, 77, 79, 0.15);
}

.response-body {
  max-height: 300px;
  overflow: auto;
}

.body-content {
  margin: 0;
  padding: 12px;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 12px;
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-all;
  background: hsl(var(--accent) / 30%);
  border-radius: 6px;
}

.body-content.json {
  color: hsl(var(--foreground) / 90%);
}


.kv-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.kv-item {
  display: flex;
  gap: 12px;
  padding: 6px 8px;
  font-size: 12px;
  border-radius: 4px;
}

.kv-item:hover {
  background: hsl(var(--accent) / 30%);
}

.kv-key {
  min-width: 150px;
  font-weight: 500;
  color: hsl(var(--foreground) / 80%);
}

.kv-value {
  flex: 1;
  color: hsl(var(--foreground) / 60%);
  word-break: break-all;
}

.empty-hint {
  padding: 20px;
  text-align: center;
  color: hsl(var(--foreground) / 40%);
}

.assertion-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.assertion-item {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 6px;
  background: hsl(var(--accent) / 20%);
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
  color: hsl(var(--foreground) / 60%);
}

.console-output {
  padding: 12px;
  font-family: 'Monaco', 'Menlo', monospace;
  font-size: 12px;
  background: hsl(var(--accent) / 30%);
  border-radius: 6px;
}

.console-line {
  line-height: 1.6;
  color: hsl(var(--foreground) / 80%);
}

.actual-request {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.request-line {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: hsl(var(--accent) / 30%);
  border-radius: 6px;
}

.request-method {
  font-weight: 600;
  color: #61affe;
}

.request-url {
  font-family: 'Monaco', 'Menlo', monospace;
  font-size: 12px;
  color: hsl(var(--foreground) / 80%);
  word-break: break-all;
}

.request-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.section-title {
  font-size: 12px;
  font-weight: 500;
  color: hsl(var(--foreground) / 70%);
}
</style>
