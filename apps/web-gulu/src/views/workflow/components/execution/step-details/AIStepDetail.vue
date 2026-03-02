<script setup lang="ts">
/**
 * AI 步骤详情组件（流程调试）
 * 使用共享的 AIResponsePanel 组件
 */
import { computed } from 'vue';

import { Alert } from 'ant-design-vue';

import type { StepResult } from '#/api/debug';

import {
  AIResponsePanel,
  ConsoleLogPanel,
  type AIResponseData,
  type ConsoleLogEntry,
  type ContentBlock,
  type AgentTrace,
} from '../../shared';

// AI 输出类型定义（后端返回的 snake_case 格式）
interface AIOutput {
  content?: string;
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
  model?: string;
  finish_reason?: string;
  system_prompt?: string;
  prompt?: string;
  tool_calls?: Array<{
    round: number;
    tool_name: string;
    arguments: string;
    result: string;
    is_error: boolean;
    duration_ms: number;
  }>;
  agent_trace?: AgentTrace;
  console_logs?: ConsoleLogEntry[];
}

interface Props {
  stepResult: StepResult;
  /** 当前正在流式输出的 AI 步骤 ID */
  currentAIStepId?: string | null;
  /** 外部实时构建的 ContentBlock[]（流式渲染） */
  streamingBlocks?: ContentBlock[] | null;
}

const props = defineProps<Props>();

// 转换为 AIResponseData
const aiResponse = computed<AIResponseData | null>(() => {
  const output = props.stepResult.output as AIOutput | undefined;
  const isRunning = props.stepResult.status === 'running';
  const hasBlocks = props.streamingBlocks && props.streamingBlocks.length > 0;

  if (!output && !props.stepResult.error && !isRunning && !hasBlocks) return null;

  const status = props.stepResult.status;

  return {
    success: status === 'success' || status === 'completed',
    content: output?.content || '',
    model: output?.model || '',
    promptTokens: output?.prompt_tokens || 0,
    completionTokens: output?.completion_tokens || 0,
    totalTokens: output?.total_tokens || 0,
    durationMs: props.stepResult.durationMs || 0,
    error: props.stepResult.error || undefined,
    toolCalls: output?.tool_calls,
    agentTrace: output?.agent_trace || undefined,
    systemPrompt: output?.system_prompt,
    prompt: output?.prompt,
    finishReason: output?.finish_reason,
  };
});

// 是否正在流式输出
const isStreaming = computed(() => {
  return props.currentAIStepId === props.stepResult.stepId && props.stepResult.status === 'running';
});

// 实时构建的 blocks（流式期间使用）
const activeBlocks = computed<ContentBlock[] | undefined>(() => {
  if (props.streamingBlocks && props.streamingBlocks.length > 0) {
    return props.streamingBlocks;
  }
  return undefined;
});

// 后置处理器日志
const consoleLogs = computed<ConsoleLogEntry[]>(() => {
  const output = props.stepResult.output as AIOutput | undefined;
  return output?.console_logs || [];
});
</script>

<template>
  <div class="ai-step-detail">
    <!-- 错误信息（仅在无响应数据时显示顶层错误） -->
    <Alert
      v-if="stepResult.error && !aiResponse"
      type="error"
      :message="stepResult.error"
      class="error-alert"
    />

    <!-- 使用统一的 AI 响应面板 -->
    <AIResponsePanel
      v-if="aiResponse"
      :response="aiResponse"
      :is-streaming="isStreaming"
      :blocks="activeBlocks"
    />

    <!-- 后置处理器日志 -->
    <ConsoleLogPanel
      v-if="consoleLogs.length > 0"
      :logs="consoleLogs"
    />

    <div v-else-if="!stepResult.error && !aiResponse" class="empty-state">
      {{ stepResult.status === 'running' ? '等待 AI 回复...' : '无响应数据' }}
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
}

.error-alert {
  margin: 0;
  flex-shrink: 0;
}

.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: hsl(var(--foreground) / 45%);
}
</style>
