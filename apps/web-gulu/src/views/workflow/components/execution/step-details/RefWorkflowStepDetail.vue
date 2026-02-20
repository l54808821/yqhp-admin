<script setup lang="ts">
import { computed } from 'vue';

import { createIconifyIcon } from '@vben/icons';
import { Alert, Descriptions, Space, Tag } from 'ant-design-vue';

import type { StepResult } from '#/api/debug';

const CheckCircle = createIconifyIcon('lucide:check-circle');
const XCircle = createIconifyIcon('lucide:x-circle');
const WorkflowIcon = createIconifyIcon('lucide:workflow');

interface RefWorkflowOutput {
  workflow_id?: number;
  workflow_name?: string;
  step_count?: number;
  steps_executed?: string[];
  outputs?: Record<string, any>;
}

interface Props {
  stepResult: StepResult;
}

const props = defineProps<Props>();

const output = computed<RefWorkflowOutput | null>(() => {
  return (props.stepResult.output as RefWorkflowOutput) || null;
});

const executionStatus = computed(() => {
  const status = props.stepResult.status;
  if (status === 'success') return { text: '成功', color: 'success' };
  if (status === 'failed') return { text: '失败', color: 'error' };
  if (status === 'timeout') return { text: '超时', color: 'warning' };
  return { text: status, color: 'default' };
});

const isSuccess = computed(() => props.stepResult.status === 'success');

// 从 stepResult 的 config 中提取传入参数
const inputParams = computed<Record<string, any>>(() => {
  const config = (props.stepResult as any).config;
  if (config?.params && typeof config.params === 'object') {
    return config.params;
  }
  return {};
});

const hasInputParams = computed(() => Object.keys(inputParams.value).length > 0);
const hasOutputs = computed(() => output.value?.outputs && Object.keys(output.value.outputs).length > 0);

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms} ms`;
  return `${(ms / 1000).toFixed(2)} s`;
}
</script>

<template>
  <div class="ref-workflow-detail">
    <!-- 状态栏 -->
    <div class="status-bar">
      <Space>
        <Tag :color="executionStatus.color" class="status-tag">
          {{ executionStatus.text }}
        </Tag>
        <span class="divider">|</span>
        <span class="metric">耗时: {{ formatDuration(stepResult.durationMs || 0) }}</span>
      </Space>
    </div>

    <!-- 错误信息 -->
    <Alert
      v-if="stepResult.error"
      type="error"
      :message="stepResult.error"
      class="error-alert"
    />

    <!-- 子工作流执行概要 -->
    <div class="result-card" v-if="output">
      <div class="result-header">
        <div class="result-icon" :style="{ backgroundColor: isSuccess ? '#52c41a15' : '#ff4d4f15' }">
          <CheckCircle v-if="isSuccess" class="icon" style="color: #52c41a" />
          <XCircle v-else class="icon" style="color: #ff4d4f" />
        </div>
        <div class="result-info">
          <div class="result-title">
            {{ output.workflow_name || '引用工作流' }}
          </div>
          <div class="result-subtitle">
            执行了 {{ output.steps_executed?.length || 0 }} / {{ output.step_count || 0 }} 个步骤
          </div>
        </div>
        <Tag color="purple" class="branch-tag">
          <WorkflowIcon class="tag-icon" />
          引用工作流
        </Tag>
      </div>

      <!-- 输入参数 -->
      <div v-if="hasInputParams" class="params-section">
        <div class="section-label">输入参数</div>
        <div class="params-table">
          <div v-for="(value, key) in inputParams" :key="key" class="param-row">
            <span class="param-key">{{ key }}</span>
            <span class="param-value">{{ value }}</span>
          </div>
        </div>
      </div>

      <!-- 输出变量 -->
      <div v-if="hasOutputs" class="params-section">
        <div class="section-label">输出变量</div>
        <div class="params-table">
          <div v-for="(value, key) in output.outputs" :key="key" class="param-row">
            <span class="param-key">{{ key }}</span>
            <span class="param-value">{{ typeof value === 'object' ? JSON.stringify(value) : value }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 基本信息 -->
    <Descriptions :column="1" size="small" bordered class="detail-desc">
      <Descriptions.Item label="步骤名称">{{ stepResult.stepName }}</Descriptions.Item>
      <Descriptions.Item label="步骤ID">
        <code>{{ stepResult.stepId }}</code>
      </Descriptions.Item>
      <Descriptions.Item label="步骤类型">ref_workflow</Descriptions.Item>
      <Descriptions.Item v-if="output?.workflow_name" label="目标工作流">
        {{ output.workflow_name }}
      </Descriptions.Item>
      <Descriptions.Item v-if="output?.workflow_id" label="工作流ID">
        <code>{{ output.workflow_id }}</code>
      </Descriptions.Item>
      <Descriptions.Item v-if="stepResult.parentId" label="父步骤">
        <code>{{ stepResult.parentId }}</code>
      </Descriptions.Item>
    </Descriptions>
  </div>
</template>

<style scoped>
.ref-workflow-detail {
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
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  font-weight: 600;
}

.tag-icon {
  width: 14px;
  height: 14px;
}

.params-section {
  background: hsl(var(--accent) / 50%);
  border-radius: 6px;
  padding: 12px;
  margin-bottom: 8px;
}

.params-section:last-child {
  margin-bottom: 0;
}

.section-label {
  font-size: 12px;
  font-weight: 500;
  color: hsl(var(--foreground) / 60%);
  margin-bottom: 8px;
}

.params-table {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.param-row {
  display: flex;
  align-items: baseline;
  gap: 12px;
  font-size: 13px;
}

.param-key {
  font-family: 'SF Mono', 'Monaco', 'Menlo', monospace;
  font-weight: 500;
  color: #9254de;
  min-width: 80px;
  flex-shrink: 0;
}

.param-value {
  font-family: 'SF Mono', 'Monaco', 'Menlo', monospace;
  color: hsl(var(--foreground));
  background: hsl(var(--background));
  padding: 2px 8px;
  border-radius: 4px;
  word-break: break-all;
  flex: 1;
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
