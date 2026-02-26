<script setup lang="ts">
import { ref, computed } from 'vue';

import { Tag, Collapse, CollapsePanel } from 'ant-design-vue';
import { createIconifyIcon } from '@vben/icons';

import type { StepEvent, ToolCallInfo } from './useAIWorkflowChat';

const ChevronRight = createIconifyIcon('lucide:chevron-right');
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
</script>

<template>
  <div class="exec-cards">
    <!-- 步骤执行卡片 -->
    <div
      v-for="step in stepEvents"
      :key="step.stepId"
      class="exec-card"
      :class="`exec-card--${step.status}`"
    >
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

      <!-- 可折叠详情 -->
      <Collapse
        v-if="step.result"
        v-model:activeKey="activeKeys"
        :bordered="false"
        class="exec-card-collapse"
      >
        <CollapsePanel :key="step.stepId" header="执行结果">
          <pre class="exec-card-result">{{ typeof step.result === 'string' ? step.result : JSON.stringify(step.result, null, 2) }}</pre>
        </CollapsePanel>
      </Collapse>
    </div>

    <!-- 工具调用卡片 -->
    <div
      v-for="(tc, idx) in toolCalls"
      :key="`tool_${idx}`"
      class="exec-card exec-card--tool"
    >
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

      <Collapse
        v-if="tc.result"
        :bordered="false"
        class="exec-card-collapse"
      >
        <CollapsePanel key="result" header="调用结果">
          <pre class="exec-card-result">{{ tc.result }}</pre>
        </CollapsePanel>
      </Collapse>
    </div>
  </div>
</template>

<style scoped>
.exec-cards {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin: 8px 0;
}

.exec-card {
  border: 1px solid #e8e8e8;
  border-radius: 10px;
  background: #fafafa;
  overflow: hidden;
  transition: border-color 0.2s;
}

.exec-card--completed { border-color: #d9f7be; }
.exec-card--failed,
.exec-card--error { border-color: #ffd8d8; }
.exec-card--running { border-color: #bae0ff; }

.exec-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  cursor: default;
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

.exec-card-collapse :deep(.ant-collapse-header) {
  padding: 4px 12px !important;
  font-size: 12px;
  color: #666;
}

.exec-card-collapse :deep(.ant-collapse-content-box) {
  padding: 6px 12px !important;
}

.exec-card-result {
  margin: 0;
  padding: 8px;
  font-size: 12px;
  line-height: 1.5;
  background: #f5f5f5;
  border-radius: 6px;
  overflow-x: auto;
  max-height: 200px;
  white-space: pre-wrap;
  word-break: break-all;
}
</style>
