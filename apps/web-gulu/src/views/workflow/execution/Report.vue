<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { Page } from '@vben/common-ui';

import {
  Alert,
  Button,
  Card,
  Descriptions,
  message,
  Progress,
  Space,
  Spin,
  Statistic,
  Table,
  Tag,
} from 'ant-design-vue';

import type { Execution } from '#/api/execution';
import type { Workflow } from '#/api/workflow';

import { getExecutionApi, stopExecutionApi } from '#/api/execution';
import { getWorkflowApi, WORKFLOW_TYPE_COLORS, WORKFLOW_TYPE_LABELS } from '#/api/workflow';

const route = useRoute();
const router = useRouter();

const loading = ref(false);
const stopping = ref(false);
const execution = ref<Execution | null>(null);
const workflow = ref<Workflow | null>(null);
const pollTimer = ref<ReturnType<typeof setInterval> | null>(null);

const executionId = computed(() => Number(route.params.id));

// 是否正在执行中
const isRunning = computed(() => {
  return execution.value?.status === 'running' || execution.value?.status === 'pending';
});

// 执行状态颜色
const statusColor = computed(() => {
  const status = execution.value?.status;
  if (status === 'completed') return 'success';
  if (status === 'failed' || status === 'timeout') return 'error';
  if (status === 'stopped') return 'warning';
  if (status === 'running') return 'processing';
  return 'default';
});

// 执行状态文本
const statusText = computed(() => {
  const status = execution.value?.status;
  const statusMap: Record<string, string> = {
    pending: '等待中',
    running: '执行中',
    completed: '已完成',
    failed: '失败',
    stopped: '已停止',
    timeout: '超时',
  };
  return statusMap[status || ''] || status;
});

// 进度百分比
const progressPercent = computed(() => {
  if (!execution.value) return 0;
  const total = execution.value.total_steps || 0;
  const success = execution.value.success_steps || 0;
  const failed = execution.value.failed_steps || 0;
  if (total === 0) return 0;
  return Math.round(((success + failed) / total) * 100);
});

onMounted(async () => {
  await loadData();
  // 如果正在执行，启动轮询
  if (isRunning.value) {
    startPolling();
  }
});

onUnmounted(() => {
  stopPolling();
});

async function loadData() {
  if (!executionId.value) return;

  try {
    loading.value = true;
    const exec = await getExecutionApi(executionId.value);
    execution.value = exec;

    if (exec.workflow_id) {
      workflow.value = await getWorkflowApi(exec.workflow_id);
    }
  } catch {
    message.error('加载执行详情失败');
  } finally {
    loading.value = false;
  }
}

function startPolling() {
  stopPolling();
  pollTimer.value = setInterval(async () => {
    if (!executionId.value) return;
    try {
      const exec = await getExecutionApi(executionId.value);
      execution.value = exec;
      // 如果执行完成，停止轮询
      if (!isRunning.value) {
        stopPolling();
      }
    } catch {
      // 忽略轮询错误
    }
  }, 3000);
}

function stopPolling() {
  if (pollTimer.value) {
    clearInterval(pollTimer.value);
    pollTimer.value = null;
  }
}

async function handleStop() {
  if (!executionId.value) return;

  try {
    stopping.value = true;
    await stopExecutionApi(executionId.value);
    message.success('已发送停止请求');
    await loadData();
  } catch {
    message.error('停止执行失败');
  } finally {
    stopping.value = false;
  }
}

function handleBack() {
  router.back();
}

function formatDate(dateStr?: string) {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleString('zh-CN');
}

function formatDuration(ms?: number) {
  if (!ms) return '-';
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(2)}s`;
  return `${(ms / 60000).toFixed(2)}min`;
}

// 解析报告内容
const reportData = computed(() => {
  if (!execution.value?.result) return null;
  try {
    return JSON.parse(execution.value.result);
  } catch {
    return null;
  }
});

// 性能报告列
const performanceColumns = [
  { title: '指标', dataIndex: 'metric', key: 'metric' },
  { title: '值', dataIndex: 'value', key: 'value' },
  { title: '单位', dataIndex: 'unit', key: 'unit' },
];

// 性能报告数据
const performanceData = computed(() => {
  if (!reportData.value) return [];
  const data = reportData.value;
  return [
    { key: 'qps', metric: 'QPS', value: data.qps || '-', unit: '请求/秒' },
    { key: 'avg_response_time', metric: '平均响应时间', value: data.avg_response_time || '-', unit: 'ms' },
    { key: 'p95_response_time', metric: 'P95 响应时间', value: data.p95_response_time || '-', unit: 'ms' },
    { key: 'p99_response_time', metric: 'P99 响应时间', value: data.p99_response_time || '-', unit: 'ms' },
    { key: 'error_rate', metric: '错误率', value: data.error_rate || '0', unit: '%' },
    { key: 'total_requests', metric: '总请求数', value: data.total_requests || '-', unit: '次' },
  ];
});

// 造数报告数据
const dataGenerationData = computed(() => {
  if (!reportData.value) return [];
  const data = reportData.value;
  return [
    { key: 'total_generated', metric: '生成总数', value: data.total_generated || '-', unit: '条' },
    { key: 'success_count', metric: '成功数', value: data.success_count || '-', unit: '条' },
    { key: 'failed_count', metric: '失败数', value: data.failed_count || '-', unit: '条' },
    { key: 'success_rate', metric: '成功率', value: data.success_rate || '-', unit: '%' },
  ];
});
</script>

<template>
  <Page title="执行报告" :description="`执行ID: ${executionId}`">
    <template #extra>
      <Space>
        <Button
          v-if="isRunning"
          danger
          :loading="stopping"
          @click="handleStop"
        >
          停止执行
        </Button>
        <Button @click="handleBack">返回</Button>
      </Space>
    </template>

    <Spin :spinning="loading">
      <!-- 执行状态卡片 -->
      <Card class="status-card">
        <div class="status-header">
          <Space size="large">
            <Tag :color="statusColor" class="status-tag">{{ statusText }}</Tag>
            <span v-if="workflow" class="workflow-name">
              {{ workflow.name }}
              <Tag v-if="workflow.workflow_type" :color="WORKFLOW_TYPE_COLORS[workflow.workflow_type]" size="small">
                {{ WORKFLOW_TYPE_LABELS[workflow.workflow_type] }}
              </Tag>
            </span>
          </Space>
        </div>

        <Progress
          v-if="execution"
          :percent="progressPercent"
          :status="execution.status === 'failed' ? 'exception' : undefined"
          :stroke-color="execution.status === 'completed' ? '#52c41a' : undefined"
        />

        <div class="stats-row">
          <Statistic title="总步骤" :value="execution?.total_steps || 0" />
          <Statistic title="成功" :value="execution?.success_steps || 0" :value-style="{ color: '#52c41a' }" />
          <Statistic title="失败" :value="execution?.failed_steps || 0" :value-style="{ color: '#ff4d4f' }" />
          <Statistic title="耗时" :value="formatDuration(execution?.duration)" />
        </div>
      </Card>

      <!-- 执行详情 -->
      <Card title="执行详情" class="detail-card">
        <Descriptions :column="2" bordered>
          <Descriptions.Item label="执行ID">{{ execution?.execution_id }}</Descriptions.Item>
          <Descriptions.Item label="执行模式">
            <Tag :color="execution?.mode === 'debug' ? 'blue' : 'green'">
              {{ execution?.mode === 'debug' ? '调试' : '执行' }}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label="开始时间">{{ formatDate(execution?.start_time) }}</Descriptions.Item>
          <Descriptions.Item label="结束时间">{{ formatDate(execution?.end_time) }}</Descriptions.Item>
          <Descriptions.Item label="执行机ID">{{ execution?.executor_id || '-' }}</Descriptions.Item>
          <Descriptions.Item label="环境ID">{{ execution?.env_id }}</Descriptions.Item>
        </Descriptions>
      </Card>

      <!-- 性能报告（压测流程） -->
      <Card
        v-if="workflow?.workflow_type === 'performance' && reportData"
        title="性能报告"
        class="report-card"
      >
        <Table
          :columns="performanceColumns"
          :data-source="performanceData"
          :pagination="false"
          size="small"
        />
      </Card>

      <!-- 造数报告（造数流程） -->
      <Card
        v-if="workflow?.workflow_type === 'data_generation' && reportData"
        title="数据生成报告"
        class="report-card"
      >
        <Table
          :columns="performanceColumns"
          :data-source="dataGenerationData"
          :pagination="false"
          size="small"
        />
      </Card>

      <!-- 原始结果 -->
      <Card v-if="execution?.result" title="执行结果" class="result-card">
        <pre class="result-content">{{ execution.result }}</pre>
      </Card>

      <!-- 错误信息 -->
      <Alert
        v-if="execution?.status === 'failed' && execution?.result"
        type="error"
        :message="execution.result"
        show-icon
        class="error-alert"
      />
    </Spin>
  </Page>
</template>

<style scoped>
.status-card {
  margin-bottom: 16px;
}

.status-header {
  margin-bottom: 16px;
}

.status-tag {
  font-size: 14px;
  padding: 4px 12px;
}

.workflow-name {
  font-size: 16px;
  font-weight: 500;
}

.stats-row {
  display: flex;
  gap: 48px;
  margin-top: 16px;
}

.detail-card {
  margin-bottom: 16px;
}

.report-card {
  margin-bottom: 16px;
}

.result-card {
  margin-bottom: 16px;
}

.result-content {
  background: #f5f5f5;
  padding: 12px;
  border-radius: 4px;
  max-height: 300px;
  overflow: auto;
  font-family: monospace;
  font-size: 12px;
  white-space: pre-wrap;
  word-break: break-all;
}

.error-alert {
  margin-top: 16px;
}
</style>
