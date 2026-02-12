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

        <!-- 工具调用记录（在回复内容之前） -->
        <div v-if="toolCallsCount > 0" class="tool-calls-section">
          <Collapse size="small" :bordered="false">
            <Collapse.Panel key="tool-calls">
              <template #header>
                <span class="tool-calls-header">
                  工具调用记录（{{ toolCallsCount }} 次）
                </span>
              </template>
              <div
                v-for="(tc, idx) in response.toolCalls"
                :key="idx"
                class="tool-call-record"
              >
                <div class="tool-call-header">
                  <Tag size="small" color="blue">第 {{ tc.round }} 轮</Tag>
                  <span class="tool-call-name">{{ tc.tool_name }}</span>
                  <Tag size="small" :color="tc.is_error ? 'error' : 'success'">
                    {{ tc.is_error ? '失败' : '成功' }}
                  </Tag>
                  <span class="tool-call-duration">{{ tc.duration_ms }}ms</span>
                </div>
                <div class="tool-call-detail">
                  <div class="tool-call-row">
                    <span class="tool-call-label">参数</span>
                    <code class="tool-call-code">{{ truncateText(tc.arguments) }}</code>
                  </div>
                  <div class="tool-call-row">
                    <span class="tool-call-label">结果</span>
                    <code class="tool-call-code" :class="{ 'is-error': tc.is_error }">{{ truncateText(tc.result) }}</code>
                  </div>
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

/* 工具调用（在 AI 回复 tab 内） */
.tool-calls-section {
  padding: 4px 12px 0;
}

.tool-calls-section :deep(.ant-collapse) {
  background: transparent;
}

.tool-calls-section :deep(.ant-collapse-item) {
  border-bottom: none;
}

.tool-calls-section :deep(.ant-collapse-header) {
  padding: 6px 0 !important;
}

.tool-calls-section :deep(.ant-collapse-content-box) {
  padding: 0 !important;
}

.tool-calls-header {
  font-size: 12px;
  font-weight: 500;
  color: hsl(var(--foreground) / 65%);
}

.tool-call-record {
  padding: 8px 0;
  border-bottom: 1px solid hsl(var(--border) / 50%);
}

.tool-call-record:last-child {
  border-bottom: none;
}

.tool-call-header {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 6px;
}

.tool-call-name {
  font-size: 12px;
  font-weight: 500;
  font-family: monospace;
}

.tool-call-duration {
  font-size: 11px;
  color: hsl(var(--muted-foreground));
  margin-left: auto;
}

.tool-call-detail {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.tool-call-row {
  display: flex;
  gap: 8px;
  align-items: flex-start;
}

.tool-call-label {
  font-size: 11px;
  color: hsl(var(--muted-foreground));
  width: 32px;
  flex-shrink: 0;
}

.tool-call-code {
  font-size: 11px;
  font-family: monospace;
  color: hsl(var(--foreground));
  word-break: break-all;
  background: hsl(var(--muted) / 30%);
  padding: 2px 6px;
  border-radius: 3px;
  flex: 1;
  min-width: 0;
}

.tool-call-code.is-error {
  color: hsl(var(--destructive));
}

/* AI 回复内容 */
.content-body {
  padding: 12px;
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
  padding: 12px;
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
  padding: 12px;
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
