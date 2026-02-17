<script setup lang="ts">
/**
 * ReAct 推理过程面板
 * 以时间线方式展示每一轮的 Thinking → Action → Observation
 */
import { computed } from 'vue';

import { createIconifyIcon } from '@vben/icons';
import { Collapse, Tag } from 'ant-design-vue';

import type { ReActRound } from './types';

const BrainIcon = createIconifyIcon('lucide:brain');
const WrenchIcon = createIconifyIcon('lucide:wrench');
const CheckCircleIcon = createIconifyIcon('lucide:check-circle-2');
const SparklesIcon = createIconifyIcon('lucide:sparkles');

interface Props {
  /** ReAct 推理轮次 */
  trace: ReActRound[];
  /** 最终回复内容 */
  finalContent?: string;
  /** 是否正在推理中 */
  isStreaming?: boolean;
}

const props = defineProps<Props>();

const hasTrace = computed(() => props.trace && props.trace.length > 0);

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
  <div class="react-trace-panel">
    <div v-if="!hasTrace && !isStreaming" class="trace-empty">
      暂无推理过程数据
    </div>

    <div v-if="hasTrace" class="trace-timeline">
      <!-- 每一轮推理 -->
      <div
        v-for="(round, idx) in trace"
        :key="round.round"
        class="trace-round"
      >
        <!-- 轮次标题 -->
        <div class="round-header">
          <span class="round-badge">第 {{ round.round }} 轮</span>
        </div>

        <!-- Thinking 思考 -->
        <div v-if="round.thinking" class="trace-step thinking-step">
          <div class="step-indicator">
            <div class="step-dot thinking-dot">
              <BrainIcon class="step-icon" />
            </div>
            <div v-if="round.tool_calls?.length" class="step-line" />
          </div>
          <div class="step-content">
            <div class="step-label">
              <Tag color="blue" class="step-tag">Thinking</Tag>
              <span class="step-label-text">推理思考</span>
            </div>
            <pre class="thinking-text">{{ round.thinking }}</pre>
          </div>
        </div>

        <!-- Actions + Observations 工具调用 -->
        <div
          v-for="(tc, tcIdx) in round.tool_calls"
          :key="`${round.round}-${tcIdx}`"
          class="trace-step action-step"
        >
          <div class="step-indicator">
            <div
              class="step-dot"
              :class="tc.is_error ? 'error-dot' : 'action-dot'"
            >
              <WrenchIcon class="step-icon" />
            </div>
            <div
              v-if="tcIdx < (round.tool_calls?.length || 0) - 1 || idx < trace.length - 1 || finalContent"
              class="step-line"
            />
          </div>
          <div class="step-content">
            <div class="step-label">
              <Tag color="orange" class="step-tag">Action</Tag>
              <span class="tc-name">{{ tc.tool_name }}</span>
              <span
                class="tc-status"
                :class="tc.is_error ? 'tc-status-error' : 'tc-status-success'"
              >
                {{ tc.is_error ? '失败' : '成功' }}
              </span>
              <span class="tc-duration">{{ formatDuration(tc.duration_ms) }}</span>
            </div>

            <!-- 工具调用详情（可折叠） -->
            <Collapse :bordered="false" class="action-collapse">
              <Collapse.Panel key="detail">
                <template #header>
                  <span class="collapse-header">查看详情</span>
                </template>
                <div class="tc-detail">
                  <div class="tc-row">
                    <span class="tc-label">参数</span>
                    <pre class="tc-code">{{ truncateText(tc.arguments) }}</pre>
                  </div>
                  <div class="tc-row">
                    <span class="tc-label">
                      <Tag color="green" size="small" class="obs-tag">Observation</Tag>
                      结果
                    </span>
                    <pre
                      class="tc-code"
                      :class="{ 'tc-code-error': tc.is_error }"
                    >{{ truncateText(tc.result) }}</pre>
                  </div>
                </div>
              </Collapse.Panel>
            </Collapse>
          </div>
        </div>
      </div>

      <!-- 最终回答 -->
      <div v-if="finalContent" class="trace-step final-step">
        <div class="step-indicator">
          <div class="step-dot final-dot">
            <CheckCircleIcon class="step-icon" />
          </div>
        </div>
        <div class="step-content">
          <div class="step-label">
            <Tag color="green" class="step-tag">
              <SparklesIcon class="inline-icon" />
              Final Answer
            </Tag>
            <span class="step-label-text">最终回答</span>
          </div>
          <pre class="final-text">{{ finalContent }}</pre>
        </div>
      </div>
    </div>

    <!-- 流式推理中 -->
    <div v-if="isStreaming" class="streaming-indicator">
      <span class="streaming-dot" />
      <span>AI 正在推理中...</span>
    </div>
  </div>
</template>

<style scoped>
.react-trace-panel {
  padding: 8px 0;
  height: 100%;
  overflow-y: auto;
}

.trace-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: hsl(var(--foreground) / 35%);
  font-size: 13px;
  padding: 32px;
}

/* 时间线 */
.trace-timeline {
  display: flex;
  flex-direction: column;
}

/* 轮次 */
.trace-round {
  margin-bottom: 4px;
}

.round-header {
  padding: 4px 0 6px 20px;
}

.round-badge {
  font-size: 11px;
  font-weight: 600;
  color: hsl(var(--foreground) / 50%);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

/* 单步 */
.trace-step {
  display: flex;
  gap: 12px;
  padding: 0 0 0 8px;
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

.thinking-dot {
  background: linear-gradient(135deg, #4f6ef7, #7c3aed);
}

.action-dot {
  background: linear-gradient(135deg, #f59e0b, #ea580c);
}

.error-dot {
  background: linear-gradient(135deg, #ef4444, #dc2626);
}

.final-dot {
  background: linear-gradient(135deg, #10b981, #059669);
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

.step-label {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
  flex-wrap: wrap;
}

.step-tag {
  margin: 0;
  font-size: 11px;
  font-weight: 600;
  border-radius: 4px;
}

.step-label-text {
  font-size: 12px;
  color: hsl(var(--foreground) / 55%);
}

.inline-icon {
  width: 12px;
  height: 12px;
  vertical-align: -2px;
  margin-right: 2px;
}

/* Thinking 文本 */
.thinking-text {
  white-space: pre-wrap;
  word-break: break-word;
  font-size: 13px;
  line-height: 1.6;
  color: hsl(var(--foreground) / 85%);
  margin: 0;
  padding: 10px 12px;
  background: hsl(var(--primary) / 6%);
  border-radius: 8px;
  border: 1px solid hsl(var(--primary) / 15%);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

/* Action 工具调用 */
.tc-name {
  font-size: 13px;
  font-weight: 600;
  color: hsl(var(--foreground) / 85%);
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

.tc-duration {
  font-size: 12px;
  color: #4f6ef7;
  font-weight: 500;
  font-family: 'SF Mono', 'Monaco', 'Menlo', monospace;
}

.action-collapse {
  background: transparent;
  margin-top: 4px;
}

.action-collapse :deep(.ant-collapse-item) {
  border: 1px solid hsl(var(--border) / 50%) !important;
  border-radius: 8px !important;
  overflow: hidden;
}

.action-collapse :deep(.ant-collapse-header) {
  padding: 6px 12px !important;
  font-size: 12px;
  min-height: unset;
  background: hsl(var(--accent) / 30%);
}

.action-collapse :deep(.ant-collapse-content-box) {
  padding: 10px 12px !important;
}

.collapse-header {
  font-size: 12px;
  color: hsl(var(--foreground) / 55%);
}

.tc-detail {
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
  display: flex;
  align-items: center;
  gap: 4px;
}

.obs-tag {
  margin: 0;
  font-size: 10px;
  border-radius: 3px;
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

/* 最终回答 */
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
  padding: 12px 20px;
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
