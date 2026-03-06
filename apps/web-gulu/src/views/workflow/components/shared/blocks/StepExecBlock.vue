<script setup lang="ts">
import { computed, ref } from 'vue';

import { createIconifyIcon } from '@vben/icons';

import type { StepExecBlock } from '../types';
import { HttpResponsePanel, AIResponsePanel, ScriptResponsePanel } from '..';

const PlayIcon = createIconifyIcon('lucide:play');
const CheckIcon = createIconifyIcon('lucide:check');
const XIcon = createIconifyIcon('lucide:x');
const SkipIcon = createIconifyIcon('lucide:skip-forward');
const LoaderIcon = createIconifyIcon('lucide:loader-2');
const ChevronDown = createIconifyIcon('lucide:chevron-down');
const ChevronRight = createIconifyIcon('lucide:chevron-right');

const props = defineProps<{
  block: StepExecBlock;
}>();

const expanded = ref(false);

const hasDetail = computed(() => !!props.block.result);

const isHttpStep = computed(() => props.block.stepType === 'http');
const isScriptStep = computed(() => props.block.stepType === 'script');
const isAIStep = computed(() =>
  ['ai', 'ai_agent', 'ai_react', 'ai_plan', 'ai_direct'].includes(props.block.stepType),
);

const aiResponseData = computed(() => {
  if (!isAIStep.value || !props.block.result) return null;
  const r = props.block.result;
  return {
    success: props.block.status === 'success',
    content: r.content || '',
    model: r.model || '',
    promptTokens: r.prompt_tokens ?? r.promptTokens ?? 0,
    completionTokens: r.completion_tokens ?? r.completionTokens ?? 0,
    totalTokens: r.total_tokens ?? r.totalTokens ?? 0,
    durationMs: props.block.durationMs || 0,
    systemPrompt: r.system_prompt ?? r.systemPrompt ?? '',
    prompt: r.prompt || '',
    finishReason: r.finish_reason ?? r.finishReason ?? '',
    toolCalls: r.tool_calls ?? r.toolCalls,
    agentTrace: r.agent_trace ?? r.agentTrace,
  };
});

const fallbackResultText = computed(() => {
  if (!props.block.result) return '';
  if (typeof props.block.result === 'string') return props.block.result;
  return JSON.stringify(props.block.result, null, 2);
});

const statusConfig = computed(() => {
  switch (props.block.status) {
    case 'running': return { icon: LoaderIcon, color: 'hsl(var(--primary))', label: '执行中', bg: 'hsl(var(--primary) / 8%)' };
    case 'success': return { icon: CheckIcon, color: '#52c41a', label: '执行成功', bg: '#52c41a10' };
    case 'failed': return { icon: XIcon, color: '#ff4d4f', label: '执行失败', bg: '#ff4d4f10' };
    case 'skipped': return { icon: SkipIcon, color: '#8c8c8c', label: '已跳过', bg: '#8c8c8c10' };
    default: return { icon: PlayIcon, color: 'hsl(var(--muted-foreground))', label: '', bg: 'transparent' };
  }
});

const durationText = computed(() => {
  if (!props.block.durationMs) return '';
  if (props.block.durationMs < 1000) return `${props.block.durationMs}ms`;
  return `${(props.block.durationMs / 1000).toFixed(2)}s`;
});

function toggleExpanded() {
  if (hasDetail.value) {
    expanded.value = !expanded.value;
  }
}
</script>

<template>
  <div class="step-exec-block" :style="{ background: statusConfig.bg }">
    <div
      class="step-header"
      :class="{ clickable: hasDetail }"
      @click="toggleExpanded"
    >
      <component
        :is="statusConfig.icon"
        class="step-icon"
        :class="{ spinning: block.status === 'running' }"
        :style="{ color: statusConfig.color }"
      />
      <span class="step-name">{{ block.stepName }}</span>
      <span class="step-label" :style="{ color: statusConfig.color }">{{ statusConfig.label }}</span>
      <span v-if="durationText" class="step-duration">{{ durationText }}</span>
      <component
        v-if="hasDetail"
        :is="expanded ? ChevronDown : ChevronRight"
        class="chevron"
      />
    </div>
    <div v-if="block.reason && block.status === 'failed'" class="step-reason">{{ block.reason }}</div>
    <div
      v-if="expanded && hasDetail"
      class="step-detail"
      :class="{ 'step-detail--fixed': isHttpStep || isScriptStep }"
    >
      <HttpResponsePanel
        v-if="isHttpStep"
        :response="block.result"
      />
      <ScriptResponsePanel
        v-else-if="isScriptStep"
        :response="block.result"
      />
      <AIResponsePanel
        v-else-if="isAIStep && aiResponseData"
        :response="aiResponseData"
      />
      <pre v-else class="result-json">{{ fallbackResultText }}</pre>
    </div>
  </div>
</template>

<style scoped>
.step-exec-block {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 6px 10px;
  border-radius: 6px;
  font-size: 12px;
}

.step-header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.step-header.clickable {
  cursor: pointer;
  border-radius: 4px;
  transition: background 0.15s;
}

.step-header.clickable:hover {
  background: hsl(var(--muted) / 30%);
}

.step-icon {
  width: 14px;
  height: 14px;
  flex-shrink: 0;
}

.spinning {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.step-name {
  font-weight: 500;
  color: hsl(var(--foreground));
}

.step-label {
  font-size: 11px;
}

.step-reason {
  font-size: 11px;
  color: #ff4d4f;
  line-height: 1.5;
  word-break: break-word;
  padding-left: 22px;
}

.step-duration {
  margin-left: auto;
  font-size: 11px;
  color: hsl(var(--muted-foreground));
}

.chevron {
  width: 12px;
  height: 12px;
  color: hsl(var(--muted-foreground));
  flex-shrink: 0;
}

.step-detail {
  margin-top: 6px;
  overflow: hidden;
  background: hsl(var(--background));
  border: 1px solid hsl(var(--border));
  border-radius: 6px;
}

.step-detail--fixed {
  height: 280px;
}

.step-detail :deep(.http-response-panel),
.step-detail :deep(.ai-response-panel),
.step-detail :deep(.script-response-panel) {
  border: none;
  box-shadow: none;
  border-radius: 0;
  height: 100%;
}

.result-json {
  margin: 0;
  padding: 6px 8px;
  font-size: 11px;
  line-height: 1.5;
  font-family: 'SF Mono', 'Menlo', monospace;
  background: hsl(var(--muted) / 20%);
  color: hsl(var(--foreground));
  border-radius: 4px;
  white-space: pre-wrap;
  word-break: break-all;
  max-height: 200px;
  overflow-y: auto;
}
</style>
