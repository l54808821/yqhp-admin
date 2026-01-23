<script setup lang="ts">
import { computed } from 'vue';

import { createIconifyIcon } from '@vben/icons';

import {
  Alert,
  Descriptions,
  Space,
  Tag,
} from 'ant-design-vue';

import type { StepResult } from '#/api/debug';

// 图标
const RepeatIcon = createIconifyIcon('lucide:repeat');
const CheckCircle = createIconifyIcon('lucide:check-circle');
const XCircle = createIconifyIcon('lucide:x-circle');
const PlayCircle = createIconifyIcon('lucide:play-circle');

// 循环输出类型定义
interface LoopOutput {
  mode?: string;
  total_iterations?: number;
  steps_executed?: string[];
  break_triggered?: boolean;
  duration_ms?: number;
  current_item?: unknown;
  current_index?: number;
}

interface Props {
  stepResult: StepResult;
}

const props = defineProps<Props>();

// 循环输出数据
const loopOutput = computed(() => {
  const output = props.stepResult.output as LoopOutput | undefined;
  if (!output) return null;

  return {
    mode: output.mode || 'for',
    totalIterations: output.total_iterations || 0,
    stepsExecuted: output.steps_executed || [],
    breakTriggered: output.break_triggered || false,
    durationMs: output.duration_ms || props.stepResult.duration_ms || 0,
  };
});

// 执行状态
const executionStatus = computed(() => {
  const status = props.stepResult.status;
  if (status === 'success') return { text: '成功', color: 'success' };
  if (status === 'failed') return { text: '失败', color: 'error' };
  if (status === 'timeout') return { text: '超时', color: 'warning' };
  return { text: status, color: 'default' };
});

// 循环模式显示
const modeLabel = computed(() => {
  const mode = loopOutput.value?.mode;
  if (mode === 'for') return 'FOR 循环';
  if (mode === 'foreach') return 'FOREACH 遍历';
  if (mode === 'while') return 'WHILE 循环';
  return mode?.toUpperCase() || '-';
});

// 模式颜色
const modeColor = computed(() => {
  const mode = loopOutput.value?.mode;
  if (mode === 'for') return 'purple';
  if (mode === 'foreach') return 'blue';
  if (mode === 'while') return 'cyan';
  return 'default';
});

// 结果颜色
const resultColor = computed(() => {
  return props.stepResult.status === 'success' ? '#52c41a' : '#ff4d4f';
});

// 格式化时长
function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms} ms`;
  return `${(ms / 1000).toFixed(2)} s`;
}
</script>

<template>
  <div class="loop-step-detail">
    <!-- 状态栏 -->
    <div class="status-bar">
      <Space>
        <Tag :color="executionStatus.color" class="status-tag">
          {{ executionStatus.text }}
        </Tag>
        <span class="divider">|</span>
        <span class="metric">耗时: {{ formatDuration(stepResult.duration_ms || 0) }}</span>
      </Space>
    </div>

    <!-- 错误信息 -->
    <Alert
      v-if="stepResult.error"
      type="error"
      :message="stepResult.error"
      class="error-alert"
    />

    <!-- 循环结果卡片 -->
    <div class="result-card" v-if="loopOutput">
      <!-- 结果图标和状态 -->
      <div class="result-header">
        <div class="result-icon" :style="{ backgroundColor: resultColor + '15' }">
          <CheckCircle v-if="stepResult.status === 'success'" class="icon" :style="{ color: resultColor }" />
          <XCircle v-else class="icon" :style="{ color: resultColor }" />
        </div>
        <div class="result-info">
          <div class="result-title">
            循环{{ stepResult.status === 'success' ? '完成' : '失败' }}
          </div>
          <div class="result-subtitle">
            共执行 {{ loopOutput.totalIterations }} 次迭代
          </div>
        </div>
        <Tag :color="modeColor" class="mode-tag">
          {{ modeLabel }}
        </Tag>
      </div>

      <!-- 循环统计 -->
      <div class="stats-section">
        <div class="stat-item">
          <RepeatIcon class="stat-icon" />
          <div class="stat-content">
            <div class="stat-value">{{ loopOutput.totalIterations }}</div>
            <div class="stat-label">迭代次数</div>
          </div>
        </div>
        <div class="stat-item">
          <PlayCircle class="stat-icon" />
          <div class="stat-content">
            <div class="stat-value">{{ loopOutput.stepsExecuted.length }}</div>
            <div class="stat-label">执行步骤</div>
          </div>
        </div>
        <div class="stat-item" v-if="loopOutput.breakTriggered">
          <Tag color="warning" size="small">提前终止</Tag>
        </div>
      </div>
    </div>

    <!-- 详细信息 -->
    <Descriptions :column="1" size="small" bordered class="detail-desc">
      <Descriptions.Item label="步骤名称">{{ stepResult.step_name }}</Descriptions.Item>
      <Descriptions.Item label="步骤ID">
        <code>{{ stepResult.step_id }}</code>
      </Descriptions.Item>
      <Descriptions.Item label="步骤类型">loop</Descriptions.Item>
      <Descriptions.Item v-if="loopOutput" label="循环模式">
        <Tag :color="modeColor" size="small">{{ modeLabel }}</Tag>
      </Descriptions.Item>
      <Descriptions.Item v-if="stepResult.parent_id" label="父步骤">
        <code>{{ stepResult.parent_id }}</code>
      </Descriptions.Item>
    </Descriptions>
  </div>
</template>

<style scoped>
.loop-step-detail {
  display: flex;
  flex-direction: column;
  gap: 12px;
  height: 100%;
  min-height: 0;
}

.status-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: hsl(var(--accent) / 50%);
  border-radius: 4px;
}

.status-tag {
  font-size: 13px;
  font-weight: 500;
}

.divider {
  color: hsl(var(--border));
}

.metric {
  font-size: 12px;
  color: hsl(var(--foreground) / 65%);
}

.error-alert {
  margin: 0;
}

.result-card {
  background: hsl(var(--card));
  border: 1px solid hsl(var(--border));
  border-radius: 8px;
  padding: 16px;
}

.result-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.result-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.result-icon .icon {
  width: 28px;
  height: 28px;
}

.result-info {
  flex: 1;
}

.result-title {
  font-size: 16px;
  font-weight: 600;
  color: hsl(var(--foreground));
}

.result-subtitle {
  font-size: 13px;
  color: hsl(var(--foreground) / 60%);
  margin-top: 2px;
}

.mode-tag {
  font-size: 12px;
  font-weight: 600;
}

.stats-section {
  display: flex;
  gap: 24px;
  padding: 12px;
  background: hsl(var(--accent) / 50%);
  border-radius: 6px;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.stat-icon {
  width: 20px;
  height: 20px;
  color: hsl(var(--primary));
}

.stat-content {
  display: flex;
  flex-direction: column;
}

.stat-value {
  font-size: 18px;
  font-weight: 600;
  color: hsl(var(--foreground));
  line-height: 1.2;
}

.stat-label {
  font-size: 11px;
  color: hsl(var(--foreground) / 55%);
}

.detail-desc {
  margin-top: auto;
}

.detail-desc code {
  font-family: 'SF Mono', 'Monaco', 'Menlo', monospace;
  font-size: 12px;
  background: hsl(var(--accent) / 50%);
  padding: 2px 6px;
  border-radius: 3px;
}
</style>
