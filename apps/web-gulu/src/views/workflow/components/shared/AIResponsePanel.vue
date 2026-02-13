<script setup lang="ts">
/**
 * 统一的 AI 响应面板组件
 * 同时用于单步调试和流程调试的 AI 结果展示
 * 参考 HttpResponsePanel 的 tabs 布局风格
 */
import { ref, computed } from 'vue';

import { createIconifyIcon } from '@vben/icons';
import { Collapse, Tabs, Tag } from 'ant-design-vue';

import type { AIResponseData } from './types';

const AlertCircleIcon = createIconifyIcon('lucide:alert-circle');

interface Props {
  response: AIResponseData;
  /** 流式 AI 内容（SSE 实时推送） */
  streamingContent?: string | null;
  /** 是否正在流式输出 */
  isStreaming?: boolean;
}

const props = defineProps<Props>();

const activeTab = ref('response');

// 显示的内容（优先流式内容）
const displayContent = computed(() => {
  if (props.streamingContent) return props.streamingContent;
  return props.response.content || '';
});

// 状态颜色
const statusColor = computed(() => props.response.success ? '#52c41a' : '#ff4d4f');

// 结束原因
const finishReasonLabel = computed(() => {
  const reason = props.response.finishReason;
  if (!reason) return '';
  const map: Record<string, string> = {
    stop: '正常结束',
    length: '达到长度限制',
    content_filter: '内容过滤',
    tool_calls: '工具调用',
    function_call: '函数调用',
  };
  return map[reason] || reason;
});

// Token 统计
const tokenStats = computed(() => {
  const r = props.response;
  if (!r.totalTokens && !r.promptTokens && !r.completionTokens) return null;
  return { prompt: r.promptTokens || 0, completion: r.completionTokens || 0, total: r.totalTokens || 0 };
});

// 是否有输入数据
const hasInput = computed(() => !!props.response.systemPrompt || !!props.response.prompt);

// 工具调用数量
const toolCallsCount = computed(() => props.response.toolCalls?.length || 0);

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

function truncateText(text: string, maxLen: number = 500): string {
  if (!text) return '';
  return text.length > maxLen ? text.slice(0, maxLen) + '...' : text;
}
</script>

<template>
  <div class="ai-response-panel">
    <!-- 状态栏：tabs 左侧 + 精简状态右侧 -->
    <div class="response-header">
      <Tabs v-model:activeKey="activeTab" size="small" class="response-tabs">
        <Tabs.TabPane key="response">
          <template #tab>
            <span>AI 回复</span>
            <span v-if="isStreaming" class="streaming-dot" />
          </template>
        </Tabs.TabPane>
        <Tabs.TabPane key="input" v-if="hasInput" tab="输入" />
        <Tabs.TabPane key="detail" tab="详情" />
      </Tabs>

      <!-- 右侧：只保留精简状态 -->
      <div class="response-meta">
        <Tag :color="statusColor" class="status-tag">
          {{ response.success ? '成功' : '失败' }}
        </Tag>
        <span class="meta-item">{{ formatDuration(response.durationMs) }}</span>
      </div>
    </div>

    <!-- 内容区域 -->
    <div class="response-content">
      <!-- AI 回复（含工具调用） -->
      <div v-if="activeTab === 'response'" class="tab-content">
        <!-- 错误信息 -->
        <div v-if="response.error" class="response-error">
          <AlertCircleIcon class="error-icon" />
          <span>{{ response.error }}</span>
        </div>

        <!-- 工具调用记录（折叠卡片，默认收起） -->
        <div v-if="toolCallsCount > 0" class="tool-calls-section">
          <Collapse :bordered="false" expand-icon-position="end" class="tool-calls-collapse">
            <Collapse.Panel
              v-for="(tc, idx) in response.toolCalls"
              :key="idx"
              :class="tc.is_error ? 'tc-card-error' : 'tc-card-success'"
            >
              <template #header>
                <div class="tc-header">
                  <span class="tc-icon">⚙</span>
                  <span class="tc-name">{{ tc.tool_name }}</span>
                  <span class="tc-status" :class="tc.is_error ? 'tc-status-error' : 'tc-status-success'">
                    {{ tc.is_error ? '执行失败' : '执行成功' }}
                  </span>
                  <Tag size="small" color="purple" class="tc-tag">local</Tag>
                  <span class="tc-spacer" />
                  <span class="tc-duration">{{ formatDuration(tc.duration_ms) }}</span>
                </div>
              </template>
              <div class="tc-body">
                <div class="tc-row">
                  <span class="tc-label">参数</span>
                  <pre class="tc-code">{{ truncateText(tc.arguments) }}</pre>
                </div>
                <div class="tc-row">
                  <span class="tc-label">结果</span>
                  <pre class="tc-code" :class="{ 'tc-code-error': tc.is_error }">{{ truncateText(tc.result) }}</pre>
                </div>
              </div>
            </Collapse.Panel>
          </Collapse>
        </div>

        <!-- AI 回复内容 -->
        <div v-if="displayContent" class="content-body">
          <pre class="content-text">{{ displayContent }}</pre>
          <span v-if="isStreaming" class="typing-cursor">|</span>
        </div>
        <div v-else-if="!response.error" class="content-empty">
          {{ isStreaming ? '等待 AI 回复...' : '无回复内容' }}
        </div>
      </div>

      <!-- 输入提示词 -->
      <div v-else-if="activeTab === 'input'" class="tab-content">
        <div class="input-content">
          <div v-if="response.systemPrompt" class="prompt-block">
            <div class="prompt-label">System Prompt</div>
            <pre class="prompt-text">{{ response.systemPrompt }}</pre>
          </div>
          <div v-if="response.prompt" class="prompt-block">
            <div class="prompt-label">User Prompt</div>
            <pre class="prompt-text">{{ response.prompt }}</pre>
          </div>
        </div>
      </div>

      <!-- 详情（模型、Token、结束原因等） -->
      <div v-else-if="activeTab === 'detail'" class="tab-content">
        <div class="detail-content">
          <div class="detail-row" v-if="response.model">
            <span class="detail-label">模型</span>
            <span class="detail-value">{{ response.model }}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">耗时</span>
            <span class="detail-value">{{ formatDuration(response.durationMs) }}</span>
          </div>
          <div class="detail-row" v-if="finishReasonLabel">
            <span class="detail-label">结束原因</span>
            <span class="detail-value">{{ finishReasonLabel }}</span>
          </div>
          <template v-if="tokenStats">
            <div class="detail-row">
              <span class="detail-label">Prompt Tokens</span>
              <span class="detail-value mono">{{ tokenStats.prompt }}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Completion Tokens</span>
              <span class="detail-value mono">{{ tokenStats.completion }}</span>
            </div>
            <div class="detail-row highlight">
              <span class="detail-label">Total Tokens</span>
              <span class="detail-value mono bold">{{ tokenStats.total }}</span>
            </div>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.ai-response-panel {
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

.streaming-dot {
  display: inline-block;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #1677ff;
  margin-left: 4px;
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
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

/* AI 回复 */
.response-error {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 10px 12px;
  background: hsl(var(--destructive) / 10%);
  color: hsl(var(--destructive));
  font-size: 13px;
}

.error-icon {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
  margin-top: 1px;
}

/* 工具调用 - 参考风格卡片 */
.tool-calls-section {
  padding: 6px 0 4px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

/* Collapse 整体 */
.tool-calls-collapse {
  background: transparent;
}

.tool-calls-collapse :deep(.ant-collapse-item) {
  border: none !important;
  margin-bottom: 8px;
  border-radius: 8px !important;
  overflow: hidden;
}

/* 成功/失败卡片的 border 需要覆盖上面的 reset */
.tool-calls-collapse :deep(.ant-collapse-item.tc-card-success) {
  border: 1px solid #4f6ef7 !important;
}

.tool-calls-collapse :deep(.ant-collapse-item.tc-card-error) {
  border: 1px solid #ff4d4f !important;
}

.tool-calls-collapse :deep(.ant-collapse-item:last-child) {
  margin-bottom: 0;
}

/* 成功卡片：蓝色整圈边框，header 浅蓝，body 正常 */
.tool-calls-collapse :deep(.ant-collapse-item.tc-card-success) {
  border: 1px solid #4f6ef7;
  background: hsl(var(--background));
}

.tool-calls-collapse :deep(.ant-collapse-item.tc-card-success > .ant-collapse-header) {
  background: linear-gradient(135deg, #f0f5ff 0%, #e8efff 100%);
}

/* 失败卡片：红色整圈边框，header 浅红，body 正常 */
.tool-calls-collapse :deep(.ant-collapse-item.tc-card-error) {
  border: 1px solid #ff4d4f;
  background: hsl(var(--background));
}

.tool-calls-collapse :deep(.ant-collapse-item.tc-card-error > .ant-collapse-header) {
  background: linear-gradient(135deg, #fff2f0 0%, #ffe8e6 100%);
}

.tool-calls-collapse :deep(.ant-collapse-header) {
  padding: 10px 14px !important;
  font-size: 13px;
  align-items: center !important;
}

.tool-calls-collapse :deep(.ant-collapse-content) {
  border-top: 1px solid hsl(var(--border) / 30%);
  background: transparent;
}

.tool-calls-collapse :deep(.ant-collapse-content-box) {
  padding: 12px 14px !important;
}

/* 面板头部 */
.tc-header {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
}

.tc-icon {
  font-size: 14px;
  opacity: 0.7;
}

.tc-name {
  font-size: 13px;
  font-weight: 600;
  color: hsl(var(--foreground) / 90%);
}

.tc-status {
  font-size: 12px;
  font-weight: 500;
}

.tc-status-success {
  color: #52c41a;
}

.tc-status-error {
  color: #ff4d4f;
}

.tc-tag {
  margin: 0;
  font-size: 11px;
  border-radius: 4px;
}

.tc-spacer {
  flex: 1;
}

.tc-duration {
  font-size: 12px;
  color: #4f6ef7;
  font-weight: 500;
  font-family: 'SF Mono', 'Monaco', 'Menlo', monospace;
}

/* 面板内容 */
.tc-body {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.tc-row {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.tc-label {
  font-size: 11px;
  color: hsl(var(--foreground) / 50%);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.tc-code {
  font-size: 12px;
  font-family: 'SF Mono', 'Monaco', 'Menlo', monospace;
  color: hsl(var(--foreground) / 80%);
  word-break: break-all;
  white-space: pre-wrap;
  background: hsl(var(--background));
  padding: 8px 10px;
  border-radius: 6px;
  margin: 0;
  line-height: 1.5;
  border: 1px solid hsl(var(--border) / 40%);
}

.tc-code-error {
  color: #ff4d4f;
  background: #fff2f0;
  border-color: hsl(0 84% 60% / 20%);
}

/* AI 回复内容 */
.content-body {
  padding: 2px;
}

.content-text {
  white-space: pre-wrap;
  word-break: break-word;
  font-size: 13px;
  line-height: 1.7;
  color: hsl(var(--foreground));
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.typing-cursor {
  color: #1677ff;
  animation: blink 1s infinite;
  font-weight: 300;
}

@keyframes blink {
  0%, 50% { opacity: 1; }
  51%, 100% { opacity: 0; }
}

.content-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: hsl(var(--foreground) / 35%);
  font-size: 13px;
  padding: 32px;
}

/* 输入提示词 */
.input-content {
  padding: 2px;
}

.prompt-block {
  margin-bottom: 16px;
}

.prompt-block:last-child {
  margin-bottom: 0;
}

.prompt-label {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: hsl(var(--foreground) / 45%);
  margin-bottom: 6px;
}

.prompt-text {
  white-space: pre-wrap;
  word-break: break-word;
  font-size: 13px;
  line-height: 1.6;
  color: hsl(var(--foreground));
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: hsl(var(--accent) / 40%);
  padding: 10px 12px;
  border-radius: 6px;
}

/* 详情 tab */
.detail-content {
  padding: 2px;
}

.detail-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  border-bottom: 1px solid hsl(var(--border) / 30%);
}

.detail-row:last-child {
  border-bottom: none;
}

.detail-row.highlight {
  background: hsl(var(--accent) / 30%);
  border-radius: 4px;
  border-bottom: none;
  margin-top: 2px;
}

.detail-label {
  font-size: 12px;
  color: hsl(var(--foreground) / 55%);
}

.detail-value {
  font-size: 12px;
  color: hsl(var(--foreground));
}

.detail-value.mono {
  font-family: 'SF Mono', 'Monaco', 'Menlo', monospace;
}

.detail-value.bold {
  font-weight: 600;
}
</style>
