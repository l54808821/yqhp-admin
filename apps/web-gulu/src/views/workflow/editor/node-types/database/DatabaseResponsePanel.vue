<script setup lang="ts">
/**
 * 数据库响应面板组件
 * 展示数据库查询/执行结果，参考 HttpResponsePanel 的设计风格
 */
import { ref, computed } from 'vue';

import { createIconifyIcon } from '@vben/icons';
import { Badge, Tabs, Tag, Table } from 'ant-design-vue';

import { ResponseBodyEditor } from '#/components/code-editor';

import type { DatabaseResponseData } from '../../types/database';
import { ConsoleLogPanel } from '../../../components/shared';

const CheckCircleIcon = createIconifyIcon('lucide:check-circle');
const XCircleIcon = createIconifyIcon('lucide:x-circle');

interface Props {
  response: DatabaseResponseData;
}

const props = defineProps<Props>();

const activeTab = ref('data');

// 是否为错误响应
const isError = computed(() => !props.response.success && !!props.response.error);

// 状态显示
const statusDisplay = computed(() => {
  if (isError.value) return 'Error';
  return props.response.success ? 'Success' : 'Failed';
});

// 状态颜色
const statusColor = computed(() => {
  if (isError.value) return '#ff4d4f';
  return props.response.success ? '#52c41a' : '#ff4d4f';
});

// 格式化耗时
function formatDuration(ms: number): string {
  if (ms == null || Number.isNaN(ms)) return '-';
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

// 结果摘要
const resultSummary = computed(() => {
  const r = props.response;
  switch (r.action) {
    case 'query':
      return `${r.rowCount ?? r.data?.length ?? 0} 行`;
    case 'execute':
      return `${r.rowsAffected ?? 0} 行受影响`;
    case 'count':
      return `计数: ${r.count ?? 0}`;
    case 'exists':
      return r.exists ? '存在' : '不存在';
    default:
      return '';
  }
});

// 表格列定义（query 操作）
const tableColumns = computed(() => {
  const columns = props.response.columns || [];
  if (columns.length === 0 && props.response.data && props.response.data.length > 0) {
    const firstRow: Record<string, any> = props.response.data[0] ?? {};
    return Object.keys(firstRow).map((key) => ({
      title: key,
      dataIndex: key,
      key,
      ellipsis: true,
      width: 150,
    }));
  }
  return columns.map((col) => ({
    title: col,
    dataIndex: col,
    key: col,
    ellipsis: true,
    width: 150,
  }));
});

// 表格数据
const tableData = computed(() => {
  return (props.response.data || []).map((row, index) => ({
    ...row,
    _rowKey: index,
  }));
});

// JSON 格式的响应
const jsonBody = computed(() => {
  const r = props.response;
  const result: Record<string, unknown> = { success: r.success, action: r.action };
  if (r.data !== undefined) result.data = r.data;
  if (r.rowsAffected !== undefined) result.rowsAffected = r.rowsAffected;
  if (r.count !== undefined) result.count = r.count;
  if (r.exists !== undefined) result.exists = r.exists;
  if (r.error) result.error = r.error;
  return JSON.stringify(result, null, 2);
});

// 是否有数据表格可展示
const hasTableData = computed(() => {
  return props.response.action === 'query' && tableData.value.length > 0;
});

// 是否有控制台输出
const hasConsoleOutput = computed(() => {
  return props.response.consoleLogs && props.response.consoleLogs.length > 0;
});

const consoleLogsCount = computed(() => {
  return props.response.consoleLogs?.length || 0;
});

// 断言结果
const assertionResults = computed(() => props.response.assertions || []);
const hasAssertions = computed(() => assertionResults.value.length > 0);
const passedAssertions = computed(() => assertionResults.value.filter((a) => a.passed).length);
const failedAssertions = computed(() => assertionResults.value.filter((a) => !a.passed).length);
</script>

<template>
  <div class="db-response-panel">
    <!-- 状态栏 -->
    <div class="response-header">
      <Tabs v-model:activeKey="activeTab" size="small" class="response-tabs">
        <Tabs.TabPane key="data" tab="数据" />
        <Tabs.TabPane key="json" tab="JSON" />
        <Tabs.TabPane key="sql" v-if="response.actualSql" tab="实际SQL" />
        <Tabs.TabPane key="assertions" v-if="hasAssertions" tab="断言" />
        <Tabs.TabPane key="console" v-if="hasConsoleOutput">
          <template #tab>
            <span>控制台</span>
            <span v-if="consoleLogsCount > 0" class="tab-count">{{ consoleLogsCount }}</span>
          </template>
        </Tabs.TabPane>
      </Tabs>

      <!-- 右侧状态信息 -->
      <div class="response-meta">
        <Tag :color="statusColor" class="status-tag">
          {{ statusDisplay }}
        </Tag>
        <span class="meta-item">{{ formatDuration(response.durationMs) }}</span>
        <span class="meta-item meta-summary">{{ resultSummary }}</span>
      </div>
    </div>

    <!-- 内容区域 -->
    <div class="response-content">
      <!-- 数据（表格或摘要） -->
      <div v-if="activeTab === 'data'" class="tab-content">
        <!-- 错误展示 -->
        <div v-if="isError" class="error-display">
          <div class="error-title">执行错误</div>
          <pre class="error-message">{{ response.error }}</pre>
        </div>
        <!-- query 结果表格 -->
        <template v-else-if="response.action === 'query'">
          <div v-if="hasTableData" class="table-wrapper">
            <Table
              :columns="tableColumns"
              :data-source="tableData"
              :row-key="(record: any) => record._rowKey"
              :pagination="tableData.length > 50 ? { pageSize: 50, showSizeChanger: true, showTotal: (total: number) => `共 ${total} 行` } : false"
              :scroll="{ x: 'max-content' }"
              size="small"
              bordered
            />
          </div>
          <div v-else class="empty-result">
            <span class="empty-icon">📭</span>
            <span>查询返回 0 行数据</span>
          </div>
        </template>
        <!-- execute 结果 -->
        <div v-else-if="response.action === 'execute'" class="result-summary">
          <div class="summary-card">
            <div class="summary-label">受影响行数</div>
            <div class="summary-value">{{ response.rowsAffected ?? 0 }}</div>
          </div>
        </div>
        <!-- count 结果 -->
        <div v-else-if="response.action === 'count'" class="result-summary">
          <div class="summary-card">
            <div class="summary-label">记录数</div>
            <div class="summary-value">{{ response.count ?? 0 }}</div>
          </div>
        </div>
        <!-- exists 结果 -->
        <div v-else-if="response.action === 'exists'" class="result-summary">
          <div class="summary-card">
            <div class="summary-label">记录存在</div>
            <div class="summary-value" :class="{ 'text-green': response.exists, 'text-red': !response.exists }">
              {{ response.exists ? '是' : '否' }}
            </div>
          </div>
        </div>
      </div>

      <!-- JSON 视图 -->
      <div v-else-if="activeTab === 'json'" class="tab-content">
        <ResponseBodyEditor :body="jsonBody" body-type="json" height="100%" />
      </div>

      <!-- 实际 SQL -->
      <div v-else-if="activeTab === 'sql'" class="tab-content">
        <div class="actual-sql">
          <div class="sql-label">实际执行的 SQL（变量替换后）</div>
          <pre class="sql-content">{{ response.actualSql }}</pre>
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
.db-response-panel {
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

/* 错误展示 */
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

/* 表格 */
.table-wrapper {
  height: 100%;
  padding: 8px;
}

.table-wrapper :deep(.ant-table) {
  font-size: 12px;
}

.table-wrapper :deep(.ant-table-thead > tr > th) {
  padding: 6px 8px;
  font-weight: 600;
  font-size: 12px;
  background: hsl(var(--accent) / 50%);
}

.table-wrapper :deep(.ant-table-tbody > tr > td) {
  padding: 4px 8px;
  font-family: 'SF Mono', 'Monaco', 'Menlo', monospace;
  font-size: 12px;
  max-width: 300px;
}

.table-wrapper :deep(.ant-table-tbody > tr:hover > td) {
  background: hsl(var(--accent) / 30%);
}

/* 空结果 */
.empty-result {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px;
  color: hsl(var(--foreground) / 40%);
  font-size: 13px;
  gap: 8px;
}

.empty-icon {
  font-size: 32px;
}

/* 结果摘要卡片 */
.result-summary {
  display: flex;
  gap: 16px;
  padding: 24px;
}

.summary-card {
  padding: 20px 32px;
  background: hsl(var(--accent) / 40%);
  border: 1px solid hsl(var(--border));
  border-radius: 8px;
  text-align: center;
}

.summary-label {
  font-size: 12px;
  color: hsl(var(--foreground) / 55%);
  margin-bottom: 8px;
}

.summary-value {
  font-size: 28px;
  font-weight: 600;
  color: hsl(var(--foreground));
  font-family: 'SF Mono', 'Monaco', 'Menlo', monospace;
}

.summary-value.text-green {
  color: #52c41a;
}

.summary-value.text-red {
  color: #ff4d4f;
}

/* 实际 SQL */
.actual-sql {
  padding: 16px;
}

.sql-label {
  font-size: 12px;
  font-weight: 500;
  color: hsl(var(--foreground) / 60%);
  margin-bottom: 8px;
}

.sql-content {
  margin: 0;
  padding: 12px 16px;
  font-family: 'SF Mono', 'Monaco', 'Menlo', monospace;
  font-size: 13px;
  background: hsl(var(--accent) / 50%);
  border: 1px solid hsl(var(--border));
  border-radius: 6px;
  white-space: pre-wrap;
  word-break: break-all;
  color: hsl(var(--foreground) / 85%);
  line-height: 1.6;
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

/* 控制台样式 */
.console-content {
  padding: 8px 0;
}
</style>
