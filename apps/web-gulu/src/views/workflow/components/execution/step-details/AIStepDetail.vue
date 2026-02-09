<script setup lang="ts">
/**
 * AI 步骤详情组件（流程调试）
 * 展示 AI 节点执行结果：回复内容、Token 用量、模型信息等
 */
import { computed } from 'vue';

import { createIconifyIcon } from '@vben/icons';
import {
  Alert,
  Tag,
  Tooltip,
} from 'ant-design-vue';

import type { StepResult } from '#/api/debug';

// 图标
const SparklesIcon = createIconifyIcon('lucide:sparkles');
const MessageSquareIcon = createIconifyIcon('lucide:message-square');

// AI 输出类型定义
interface AIOutput {
  content?: string;
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
  model?: string;
  finish_reason?: string;
}

interface Props {
  stepResult: StepResult;
  /** 流式 AI 内容（SSE 实时推送） */
  aiContent?: string | null;
  /** 当前正在流式输出的 AI 步骤 ID */
  currentAIStepId?: string | null;
}

const props = defineProps<Props>();

// AI 输出数据
const aiOutput = computed<AIOutput | null>(() => {
  return (props.stepResult.output as AIOutput) || null;
});

// 显示的内容（优先流式内容，其次静态内容）
const displayContent = computed(() => {
  if (props.currentAIStepId === props.stepResult.stepId && props.aiContent) {
    return props.aiContent;
  }
  return aiOutput.value?.content || '';
});

// 是否正在流式输出
const isStreaming = computed(() => {
  return props.currentAIStepId === props.stepResult.stepId && props.stepResult.status === 'running';
});

// 执行状态
const executionStatus = computed(() => {
  const status = props.stepResult.status;
  if (status === 'success' || status === 'completed') return { text: '成功', color: 'success' as const };
  if (status === 'failed') return { text: '失败', color: 'error' as const };
  if (status === 'running') return { text: '执行中', color: 'processing' as const };
  if (status === 'timeout') return { text: '超时', color: 'warning' as const };
  if (status === 'skipped') return { text: '跳过', color: 'default' as const };
  return { text: status || '等待', color: 'default' as const };
});

// 结束原因显示
const finishReasonLabel = computed(() => {
  const reason = aiOutput.value?.finish_reason;
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
  const output = aiOutput.value;
  if (!output) return null;
  const total = output.total_tokens || 0;
  if (total === 0 && !output.prompt_tokens && !output.completion_tokens) return null;
  return {
    prompt: output.prompt_tokens || 0,
    completion: output.completion_tokens || 0,
    total,
  };
});

// 格式化时长
function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}
</script>

<template>
  <div class="ai-step-detail">
    <!-- 状态栏：状态 + 耗时 + 模型 + 结束原因 + Token -->
    <div class="status-bar">
      <div class="status-left">
        <Tag :color="executionStatus.color" class="status-tag">
          {{ executionStatus.text }}
        </Tag>
        <span class="meta-sep">·</span>
        <span class="meta-text">{{ formatDuration(stepResult.durationMs || 0) }}</span>
        <template v-if="aiOutput?.model">
          <span class="meta-sep">·</span>
          <span class="meta-text">{{ aiOutput.model }}</span>
        </template>
        <template v-if="finishReasonLabel">
          <span class="meta-sep">·</span>
          <span class="meta-text muted">{{ finishReasonLabel }}</span>
        </template>
      </div>
      <div v-if="tokenStats" class="status-right">
        <Tooltip title="Prompt / Completion / Total">
          <span class="token-inline">
            <span class="token-num">{{ tokenStats.prompt }}</span>
            <span class="token-op">+</span>
            <span class="token-num">{{ tokenStats.completion }}</span>
            <span class="token-op">=</span>
            <span class="token-num total">{{ tokenStats.total }}</span>
            <span class="token-label">tokens</span>
          </span>
        </Tooltip>
      </div>
    </div>

    <!-- 错误信息 -->
    <Alert
      v-if="stepResult.error"
      type="error"
      :message="stepResult.error"
      class="error-alert"
    />

    <!-- AI 回复内容 -->
    <div class="content-section">
      <div class="content-header">
        <MessageSquareIcon class="content-header-icon" />
        <span>AI 回复</span>
        <span v-if="isStreaming" class="streaming-badge">
          <SparklesIcon class="streaming-icon" />
          生成中...
        </span>
      </div>
      <div class="content-body" v-if="displayContent">
        <pre class="content-text">{{ displayContent }}</pre>
        <span v-if="isStreaming" class="typing-cursor">|</span>
      </div>
      <div v-else class="content-empty">
        {{ stepResult.status === 'running' ? '等待 AI 回复...' : '无回复内容' }}
      </div>
    </div>
  </div>
</template>

<style scoped>
.ai-step-detail {
  display: flex;
  flex-direction: column;
  gap: 8px;
  height: 100%;
  min-height: 0;
  overflow: hidden;
}

/* 状态栏 */
.status-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 6px 10px;
  background: hsl(var(--accent) / 50%);
  border-radius: 4px;
  flex-shrink: 0;
  flex-wrap: wrap;
}

.status-left {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.status-tag {
  font-size: 12px;
  font-weight: 500;
  margin: 0;
}

.meta-sep {
  color: hsl(var(--foreground) / 20%);
  font-size: 12px;
}

.meta-text {
  font-size: 12px;
  color: hsl(var(--foreground) / 60%);
}

.meta-text.muted {
  color: hsl(var(--foreground) / 40%);
}

.status-right {
  flex-shrink: 0;
}

.token-inline {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: 12px;
  font-family: 'SF Mono', 'Monaco', 'Menlo', monospace;
  color: hsl(var(--foreground) / 55%);
  cursor: default;
}

.token-num {
  color: hsl(var(--foreground) / 70%);
}

.token-num.total {
  font-weight: 600;
  color: hsl(var(--foreground));
}

.token-op {
  color: hsl(var(--foreground) / 30%);
}

.token-label {
  font-size: 11px;
  color: hsl(var(--foreground) / 40%);
  margin-left: 2px;
}

.error-alert {
  margin: 0;
  flex-shrink: 0;
}

/* AI 回复内容 */
.content-section {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  background: hsl(var(--card));
  border: 1px solid hsl(var(--border));
  border-radius: 8px;
  overflow: hidden;
}

.content-header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  font-size: 12px;
  font-weight: 500;
  color: hsl(var(--foreground) / 60%);
  border-bottom: 1px solid hsl(var(--border));
  flex-shrink: 0;
}

.content-header-icon {
  width: 14px;
  height: 14px;
  color: #1677ff;
}

.streaming-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-left: auto;
  font-size: 12px;
  color: #1677ff;
  font-weight: 400;
}

.streaming-icon {
  width: 14px;
  height: 14px;
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

.content-body {
  flex: 1;
  overflow-y: auto;
  padding: 12px 16px;
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
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: hsl(var(--foreground) / 35%);
  font-size: 13px;
  padding: 32px;
}
</style>
