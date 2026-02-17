<script setup lang="ts">
/**
 * Plan-and-Execute 执行轨迹面板
 * 展示：计划 → 逐步执行 → 汇总
 */
import { computed } from 'vue';

import { createIconifyIcon } from '@vben/icons';
import { Collapse, Tag } from 'ant-design-vue';

import type { PlanExecTrace } from './types';

const ClipboardListIcon = createIconifyIcon('lucide:clipboard-list');
const PlayIcon = createIconifyIcon('lucide:play');
const CheckCircleIcon = createIconifyIcon('lucide:check-circle-2');
const XCircleIcon = createIconifyIcon('lucide:x-circle');
const SparklesIcon = createIconifyIcon('lucide:sparkles');

interface Props {
  trace: PlanExecTrace;
  finalContent?: string;
  isStreaming?: boolean;
}

const props = defineProps<Props>();

const completedSteps = computed(() =>
  props.trace.steps.filter(s => s.status === 'completed').length,
);

const totalSteps = computed(() => props.trace.steps.length);

function getStatusIcon(status: string) {
  switch (status) {
    case 'completed': return CheckCircleIcon;
    case 'failed': return XCircleIcon;
    case 'running': return PlayIcon;
    default: return PlayIcon;
  }
}

function getStatusColor(status: string) {
  switch (status) {
    case 'completed': return '#52c41a';
    case 'failed': return '#ff4d4f';
    case 'running': return '#1677ff';
    default: return 'hsl(var(--foreground) / 30%)';
  }
}

function getStatusLabel(status: string) {
  switch (status) {
    case 'completed': return '完成';
    case 'failed': return '失败';
    case 'running': return '执行中';
    default: return '待执行';
  }
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

function truncateText(text: string, maxLen: number = 800): string {
  if (!text) return '';
  return text.length > maxLen ? text.slice(0, maxLen) + '...' : text;
}
</script>

<template>
  <div class="plan-exec-panel">
    <!-- 计划概览 -->
    <div class="plan-section">
      <div class="section-header">
        <ClipboardListIcon class="section-icon plan-icon" />
        <span class="section-title">执行计划</span>
        <Tag color="blue" class="progress-tag">
          {{ completedSteps }} / {{ totalSteps }} 步
        </Tag>
      </div>
      <pre class="plan-text">{{ trace.plan }}</pre>
    </div>

    <!-- 步骤执行 -->
    <div class="steps-section">
      <div class="section-header">
        <PlayIcon class="section-icon exec-icon" />
        <span class="section-title">执行过程</span>
      </div>

      <div class="steps-timeline">
        <div
          v-for="(step, idx) in trace.steps"
          :key="step.index"
          class="step-item"
        >
          <div class="step-indicator">
            <div
              class="step-dot"
              :style="{ background: getStatusColor(step.status) }"
            >
              <component :is="getStatusIcon(step.status)" class="step-icon" />
            </div>
            <div
              v-if="idx < trace.steps.length - 1 || finalContent"
              class="step-line"
            />
          </div>

          <div class="step-content">
            <div class="step-header">
              <span class="step-index">步骤 {{ step.index }}</span>
              <span class="step-task">{{ step.task }}</span>
              <Tag
                :color="getStatusColor(step.status)"
                size="small"
                class="step-status-tag"
              >
                {{ getStatusLabel(step.status) }}
              </Tag>
            </div>

            <!-- 步骤结果 -->
            <div v-if="step.result" class="step-result">
              <Collapse :bordered="false" class="result-collapse">
                <Collapse.Panel key="result">
                  <template #header>
                    <span class="collapse-header">查看执行结果</span>
                  </template>
                  <pre class="result-text">{{ truncateText(step.result) }}</pre>

                  <!-- 工具调用 -->
                  <div v-if="step.tool_calls?.length" class="step-tools">
                    <div class="tools-label">工具调用 ({{ step.tool_calls.length }})</div>
                    <div
                      v-for="(tc, tcIdx) in step.tool_calls"
                      :key="tcIdx"
                      class="tool-item"
                    >
                      <span class="tool-icon">⚙</span>
                      <span class="tool-name">{{ tc.tool_name }}</span>
                      <Tag
                        :color="tc.is_error ? '#ff4d4f' : '#52c41a'"
                        size="small"
                      >
                        {{ tc.is_error ? '失败' : '成功' }}
                      </Tag>
                      <span class="tool-duration">{{ formatDuration(tc.duration_ms) }}</span>
                    </div>
                  </div>
                </Collapse.Panel>
              </Collapse>
            </div>
          </div>
        </div>

        <!-- 汇总 -->
        <div v-if="finalContent" class="step-item final-item">
          <div class="step-indicator">
            <div class="step-dot final-dot">
              <SparklesIcon class="step-icon" />
            </div>
          </div>
          <div class="step-content">
            <div class="step-header">
              <Tag color="green" class="step-tag">
                <SparklesIcon class="inline-icon" />
                Synthesis
              </Tag>
              <span class="step-task">最终汇总</span>
            </div>
            <pre class="final-text">{{ finalContent }}</pre>
          </div>
        </div>
      </div>
    </div>

    <!-- 流式推理中 -->
    <div v-if="isStreaming" class="streaming-indicator">
      <span class="streaming-dot" />
      <span>AI 正在执行计划中...</span>
    </div>
  </div>
</template>

<style scoped>
.plan-exec-panel {
  padding: 8px 0;
  height: 100%;
  overflow-y: auto;
}

/* 区域 */
.plan-section,
.steps-section {
  margin-bottom: 16px;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 0 8px;
}

.section-icon {
  width: 16px;
  height: 16px;
}

.plan-icon {
  color: #4f6ef7;
}

.exec-icon {
  color: #f59e0b;
}

.section-title {
  font-size: 13px;
  font-weight: 600;
  color: hsl(var(--foreground) / 80%);
}

.progress-tag {
  margin: 0;
  font-size: 11px;
}

/* 计划文本 */
.plan-text {
  white-space: pre-wrap;
  word-break: break-word;
  font-size: 12px;
  line-height: 1.6;
  color: hsl(var(--foreground) / 75%);
  margin: 0;
  padding: 10px 12px;
  background: hsl(var(--primary) / 6%);
  border-radius: 8px;
  border: 1px solid hsl(var(--primary) / 15%);
  font-family: 'SF Mono', 'Monaco', 'Menlo', monospace;
}

/* 步骤时间线 */
.steps-timeline {
  display: flex;
  flex-direction: column;
}

.step-item {
  display: flex;
  gap: 12px;
  padding: 0 0 0 4px;
}

.step-indicator {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex-shrink: 0;
  width: 28px;
}

.step-dot {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  flex-shrink: 0;
}

.step-icon {
  width: 14px;
  height: 14px;
  color: white;
}

.step-line {
  width: 2px;
  flex: 1;
  min-height: 12px;
  background: hsl(var(--border));
  margin: 4px 0;
}

.step-content {
  flex: 1;
  min-width: 0;
  padding-bottom: 12px;
}

.step-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
  flex-wrap: wrap;
}

.step-index {
  font-size: 12px;
  font-weight: 600;
  color: hsl(var(--foreground) / 60%);
}

.step-task {
  font-size: 13px;
  color: hsl(var(--foreground) / 85%);
}

.step-status-tag {
  margin: 0;
  font-size: 11px;
}

.step-tag {
  margin: 0;
  font-size: 11px;
  font-weight: 600;
}

.inline-icon {
  width: 12px;
  height: 12px;
  vertical-align: -2px;
  margin-right: 2px;
}

/* 步骤结果折叠 */
.result-collapse {
  background: transparent;
}

.result-collapse :deep(.ant-collapse-item) {
  border: 1px solid hsl(var(--border) / 50%) !important;
  border-radius: 8px !important;
  overflow: hidden;
}

.result-collapse :deep(.ant-collapse-header) {
  padding: 6px 12px !important;
  font-size: 12px;
  min-height: unset;
  background: hsl(var(--accent) / 30%);
}

.result-collapse :deep(.ant-collapse-content-box) {
  padding: 10px 12px !important;
}

.collapse-header {
  font-size: 12px;
  color: hsl(var(--foreground) / 55%);
}

.result-text {
  white-space: pre-wrap;
  word-break: break-word;
  font-size: 12px;
  line-height: 1.5;
  color: hsl(var(--foreground) / 80%);
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

/* 工具调用 */
.step-tools {
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid hsl(var(--border) / 30%);
}

.tools-label {
  font-size: 11px;
  font-weight: 600;
  color: hsl(var(--foreground) / 50%);
  margin-bottom: 6px;
}

.tool-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 0;
  font-size: 12px;
}

.tool-icon {
  font-size: 12px;
  opacity: 0.6;
}

.tool-name {
  font-weight: 500;
  color: hsl(var(--foreground) / 80%);
}

.tool-duration {
  font-size: 11px;
  color: #4f6ef7;
  font-family: 'SF Mono', 'Monaco', 'Menlo', monospace;
}

/* 最终汇总 */
.final-dot {
  background: linear-gradient(135deg, #10b981, #059669);
}

.final-text {
  white-space: pre-wrap;
  word-break: break-word;
  font-size: 13px;
  line-height: 1.7;
  color: hsl(var(--foreground));
  margin: 0;
  padding: 10px 12px;
  background: hsl(142 76% 36% / 6%);
  border-radius: 8px;
  border: 1px solid hsl(142 76% 36% / 15%);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

/* 流式指示器 */
.streaming-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 8px;
  font-size: 13px;
  color: hsl(var(--foreground) / 55%);
}

.streaming-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #1677ff;
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}
</style>
