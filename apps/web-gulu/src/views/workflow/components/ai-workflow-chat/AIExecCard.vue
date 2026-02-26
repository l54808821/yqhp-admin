<script setup lang="ts">
import { ref } from 'vue';

import { Tag, Collapse, CollapsePanel } from 'ant-design-vue';
import { createIconifyIcon } from '@vben/icons';

import type { StepEvent, ToolCallInfo } from './useAIWorkflowChat';
import { HttpResponsePanel, AIResponsePanel, ScriptResponsePanel } from '../shared';

const CheckCircle = createIconifyIcon('lucide:check-circle-2');
const XCircle = createIconifyIcon('lucide:x-circle');
const Loader = createIconifyIcon('lucide:loader');
const Wrench = createIconifyIcon('lucide:wrench');

interface Props {
  stepEvents?: StepEvent[];
  toolCalls?: ToolCallInfo[];
}

defineProps<Props>();

const activeKeys = ref<string[]>([]);

function stepIcon(status: string) {
  switch (status) {
    case 'completed': return CheckCircle;
    case 'failed':
    case 'error': return XCircle;
    default: return Loader;
  }
}

function stepTagColor(status: string) {
  switch (status) {
    case 'completed': return 'success';
    case 'failed':
    case 'error': return 'error';
    default: return 'processing';
  }
}

function stepTagText(status: string) {
  switch (status) {
    case 'completed': return '执行成功';
    case 'failed': return '执行失败';
    case 'error': return '出错';
    default: return '执行中';
  }
}

function stepTypeLabel(type: string) {
  const map: Record<string, string> = {
    http: 'HTTP请求',
    script: '脚本执行',
    ai: 'AI调用',
    condition: '条件判断',
    loop: '循环',
    group: '步骤组',
  };
  return map[type] || type;
}

function formatDuration(ms?: number) {
  if (!ms && ms !== 0) return '';
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

function toAIResponseData(step: StepEvent) {
  const r = step.result || {};
  return {
    success: step.status === 'completed',
    content: r.content || '',
    model: r.model || '',
    promptTokens: r.prompt_tokens ?? r.promptTokens ?? 0,
    completionTokens: r.completion_tokens ?? r.completionTokens ?? 0,
    totalTokens: r.total_tokens ?? r.totalTokens ?? 0,
    durationMs: step.durationMs || 0,
    systemPrompt: r.system_prompt ?? r.systemPrompt ?? '',
    prompt: r.prompt || '',
    finishReason: r.finish_reason ?? r.finishReason ?? '',
    toolCalls: r.tool_calls ?? r.toolCalls,
    agentTrace: r.agent_trace ?? r.agentTrace,
  };
}
</script>

<template>
  <div class="exec-cards">
    <!-- 步骤执行卡片 -->
    <Collapse
      v-model:activeKey="activeKeys"
      :bordered="false"
      class="exec-collapse"
      expand-icon-position="end"
    >
      <CollapsePanel
        v-for="step in stepEvents"
        :key="step.stepId"
        :collapsible="step.result ? 'header' : 'disabled'"
        :show-arrow="!!step.result"
        class="exec-panel"
        :class="`exec-panel--${step.status}`"
      >
        <template #header>
          <div class="exec-card-header">
            <div class="exec-card-left">
              <component
                :is="stepIcon(step.status)"
                class="exec-card-icon"
                :class="{
                  'text-green-500': step.status === 'completed',
                  'text-red-500': step.status === 'failed',
                  'text-blue-500 animate-spin': step.status === 'running',
                }"
              />
              <span class="exec-card-name">
                {{ step.stepName || stepTypeLabel(step.stepType) }}
              </span>
              <Tag :color="stepTagColor(step.status)" class="exec-card-tag">
                {{ stepTagText(step.status) }}
              </Tag>
            </div>
            <div class="exec-card-right">
              <Tag color="default">local</Tag>
              <span v-if="step.durationMs != null" class="exec-card-duration">
                {{ formatDuration(step.durationMs) }}
              </span>
            </div>
          </div>
        </template>

        <div v-if="step.result" class="exec-card-detail">
          <HttpResponsePanel
            v-if="step.stepType === 'http'"
            :response="step.result"
          />
            <AIResponsePanel
              v-else-if="step.stepType === 'ai'"
              :response="toAIResponseData(step)"
            />
          <ScriptResponsePanel
            v-else-if="step.stepType === 'script'"
            :response="step.result"
          />
          <pre v-else class="exec-card-result">{{ typeof step.result === 'string' ? step.result : JSON.stringify(step.result, null, 2) }}</pre>
        </div>
      </CollapsePanel>
    </Collapse>

    <!-- 工具调用卡片 -->
    <Collapse
      v-if="toolCalls?.length"
      v-model:activeKey="activeKeys"
      :bordered="false"
      class="exec-collapse"
      expand-icon-position="end"
    >
      <CollapsePanel
        v-for="(tc, idx) in toolCalls"
        :key="`tool_${idx}`"
        :collapsible="tc.result ? 'header' : 'disabled'"
        :show-arrow="!!tc.result"
        class="exec-panel exec-panel--tool"
      >
        <template #header>
          <div class="exec-card-header">
            <div class="exec-card-left">
              <Wrench
                class="exec-card-icon"
                :class="{
                  'text-green-500': tc.status === 'completed',
                  'text-red-500': tc.status === 'error',
                  'text-purple-500 animate-spin': tc.status === 'running',
                }"
              />
              <span class="exec-card-name">{{ tc.toolName }}</span>
              <Tag :color="stepTagColor(tc.status)" class="exec-card-tag">
                {{ tc.status === 'completed' ? '调用成功' : tc.status === 'error' ? '调用失败' : '调用中' }}
              </Tag>
            </div>
            <div class="exec-card-right">
              <span v-if="tc.durationMs" class="exec-card-duration">
                {{ formatDuration(tc.durationMs) }}
              </span>
            </div>
          </div>
        </template>

        <div v-if="tc.result" class="exec-card-detail">
          <pre class="exec-card-result">{{ tc.result }}</pre>
        </div>
      </CollapsePanel>
    </Collapse>
  </div>
</template>

<style scoped>
.exec-cards {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin: 8px 0;
}

/* 重置 Collapse 默认样式 */
.exec-collapse {
  background: transparent !important;
}

.exec-collapse :deep(.ant-collapse-item) {
  border: none !important;
}

/* 每个面板就是一个卡片 */
.exec-panel {
  border: 1px solid #e8e8e8 !important;
  border-radius: 10px !important;
  background: #fafafa;
  overflow: hidden;
  margin-bottom: 6px;
  transition: border-color 0.2s;
}

.exec-panel--completed { border-color: #d9f7be !important; }
.exec-panel--failed,
.exec-panel--error { border-color: #ffd8d8 !important; }
.exec-panel--running { border-color: #bae0ff !important; }

/* header 样式覆盖 */
.exec-panel :deep(.ant-collapse-header) {
  padding: 0 !important;
  background: transparent;
  align-items: center;
}

.exec-panel :deep(.ant-collapse-expand-icon) {
  padding: 0 12px 0 0 !important;
  color: #999;
}

.exec-panel :deep(.ant-collapse-content) {
  border-top: 1px solid #f0f0f0;
}

.exec-panel :deep(.ant-collapse-content-box) {
  padding: 0 !important;
}

/* header 内容 */
.exec-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  width: 100%;
}

.exec-card-left {
  display: flex;
  align-items: center;
  gap: 6px;
}

.exec-card-icon {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
}

.exec-card-name {
  font-size: 13px;
  font-weight: 500;
  color: #333;
}

.exec-card-tag {
  font-size: 11px;
  line-height: 1;
  padding: 1px 6px;
}

.exec-card-right {
  display: flex;
  align-items: center;
  gap: 6px;
}

.exec-card-duration {
  font-size: 12px;
  color: #999;
  font-variant-numeric: tabular-nums;
}

/* 详情区 */
.exec-card-detail {
  max-height: 360px;
  overflow: auto;
}

.exec-card-detail :deep(.http-response-panel),
.exec-card-detail :deep(.ai-response-panel),
.exec-card-detail :deep(.script-response-panel) {
  border: none;
  box-shadow: none;
  border-radius: 0;
}

.exec-card-result {
  margin: 0;
  padding: 8px 12px;
  font-size: 12px;
  line-height: 1.5;
  background: #f5f5f5;
  overflow-x: auto;
  max-height: 200px;
  white-space: pre-wrap;
  word-break: break-all;
}
</style>
