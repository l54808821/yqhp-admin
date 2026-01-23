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
const CheckCircle = createIconifyIcon('lucide:check-circle');
const XCircle = createIconifyIcon('lucide:x-circle');
const GitBranch = createIconifyIcon('lucide:git-branch');

// 条件输出类型定义
interface ConditionOutput {
  expression?: string;
  result?: boolean;
  branch_taken?: string;
  steps_executed?: string[];
}

interface Props {
  stepResult: StepResult;
}

const props = defineProps<Props>();

// 条件输出数据
const conditionOutput = computed(() => {
  const output = props.stepResult.output as ConditionOutput | undefined;
  if (!output) return null;

  return {
    expression: output.expression || '',
    result: output.result ?? false,
    branchTaken: output.branch_taken || '',
    stepsExecuted: output.steps_executed || [],
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

// 条件类型显示
const branchTypeLabel = computed(() => {
  const type = conditionOutput.value?.branchTaken;
  if (type === 'if') return 'IF';
  if (type === 'else_if') return 'ELSE IF';
  if (type === 'else') return 'ELSE';
  return type?.toUpperCase() || '-';
});

// 条件结果颜色
const resultColor = computed(() => {
  return conditionOutput.value?.result ? '#52c41a' : '#ff4d4f';
});

// 格式化时长
function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms} ms`;
  return `${(ms / 1000).toFixed(2)} s`;
}
</script>

<template>
  <div class="condition-step-detail">
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

    <!-- 条件判断结果卡片 -->
    <div class="result-card" v-if="conditionOutput">
      <!-- 结果图标和状态 -->
      <div class="result-header">
        <div class="result-icon" :style="{ backgroundColor: resultColor + '15' }">
          <CheckCircle v-if="conditionOutput.result" class="icon" :style="{ color: resultColor }" />
          <XCircle v-else class="icon" :style="{ color: resultColor }" />
        </div>
        <div class="result-info">
          <div class="result-title">
            条件{{ conditionOutput.result ? '满足' : '不满足' }}
          </div>
          <div class="result-subtitle">
            {{ conditionOutput.result ? '执行了子步骤' : '跳过了子步骤' }}
          </div>
        </div>
        <Tag :color="conditionOutput.result ? 'success' : 'default'" class="branch-tag">
          {{ branchTypeLabel }}
        </Tag>
      </div>

      <!-- 表达式 -->
      <div class="expression-section">
        <div class="section-label">
          <GitBranch class="label-icon" />
          条件表达式
        </div>
        <div class="expression-content">
          <code>{{ conditionOutput.expression || '(无表达式)' }}</code>
          <Tag :color="conditionOutput.result ? 'success' : 'error'" size="small">
            {{ conditionOutput.result ? 'TRUE' : 'FALSE' }}
          </Tag>
        </div>
      </div>
    </div>

    <!-- 详细信息 -->
    <Descriptions :column="1" size="small" bordered class="detail-desc">
      <Descriptions.Item label="步骤名称">{{ stepResult.step_name }}</Descriptions.Item>
      <Descriptions.Item label="步骤ID">
        <code>{{ stepResult.step_id }}</code>
      </Descriptions.Item>
      <Descriptions.Item label="步骤类型">condition</Descriptions.Item>
      <Descriptions.Item v-if="stepResult.parent_id" label="父步骤">
        <code>{{ stepResult.parent_id }}</code>
      </Descriptions.Item>
      <Descriptions.Item v-if="stepResult.iteration" label="迭代次数">
        第 {{ stepResult.iteration }} 次
      </Descriptions.Item>
    </Descriptions>
  </div>
</template>

<style scoped>
.condition-step-detail {
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

.branch-tag {
  font-size: 12px;
  font-weight: 600;
}

.expression-section {
  background: hsl(var(--accent) / 50%);
  border-radius: 6px;
  padding: 12px;
  margin-bottom: 12px;
}

.section-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 500;
  color: hsl(var(--foreground) / 60%);
  margin-bottom: 8px;
}

.label-icon {
  width: 14px;
  height: 14px;
}

.expression-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.expression-content code {
  flex: 1;
  font-family: 'SF Mono', 'Monaco', 'Menlo', monospace;
  font-size: 14px;
  color: hsl(var(--foreground));
  background: hsl(var(--background));
  padding: 8px 12px;
  border-radius: 4px;
  word-break: break-all;
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
