<script setup lang="ts">
import type { EchartsUIType } from '@vben/plugins/echarts';

import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { Page } from '@vben/common-ui';
import { EchartsUI, useEcharts } from '@vben/plugins/echarts';

import {
  Button,
  Card,
  Descriptions,
  message,
  Popconfirm,
  Space,
  Spin,
  Statistic,
  Table,
  Tag,
} from 'ant-design-vue';

import type { Execution, ExecutionMetrics, StepMetrics } from '#/api/execution';
import type { Workflow } from '#/api/workflow';

import {
  getExecutionApi,
  getExecutionMetricsApi,
  stopExecutionApi,
} from '#/api/execution';
import { getWorkflowApi } from '#/api/workflow';

const route = useRoute();
const router = useRouter();

const loading = ref(false);
const stopping = ref(false);
const execution = ref<Execution | null>(null);
const workflow = ref<Workflow | null>(null);
const pollTimer = ref<ReturnType<typeof setInterval> | null>(null);

const executionId = computed(() => Number(route.params.executionId));

// 时间序列数据
interface TimePoint {
  time: string;
  totalIterations: number;
  totalVUs: number;
  successCount: number;
  failureCount: number;
}

const timeSeriesData = ref<TimePoint[]>([]);

// 当前指标
const currentMetrics = ref<ExecutionMetrics | null>(null);

// ECharts refs
const qpsChartRef = ref<EchartsUIType>();
const rtChartRef = ref<EchartsUIType>();
const vuChartRef = ref<EchartsUIType>();
const errorChartRef = ref<EchartsUIType>();

const { renderEcharts: renderQps, updateDate: updateQps } = useEcharts(qpsChartRef);
const { renderEcharts: renderRt, updateDate: updateRt } = useEcharts(rtChartRef);
const { renderEcharts: renderVu, updateDate: updateVu } = useEcharts(vuChartRef);
const { renderEcharts: renderError, updateDate: updateError } = useEcharts(errorChartRef);

const isRunning = computed(() => {
  return execution.value?.status === 'running' || execution.value?.status === 'pending';
});

const statusColor = computed(() => {
  const map: Record<string, string> = {
    pending: 'default',
    running: 'processing',
    completed: 'success',
    failed: 'error',
    stopped: 'warning',
    timeout: 'error',
  };
  return map[execution.value?.status || ''] || 'default';
});

const statusText = computed(() => {
  const map: Record<string, string> = {
    pending: '等待中',
    running: '执行中',
    completed: '已完成',
    failed: '失败',
    stopped: '已停止',
    timeout: '超时',
  };
  return map[execution.value?.status || ''] || execution.value?.status || '';
});

// 汇总统计
const totalRequests = computed(() => {
  if (!currentMetrics.value?.step_metrics) return 0;
  return Object.values(currentMetrics.value.step_metrics).reduce(
    (sum, s) => sum + s.count,
    0,
  );
});

const totalSuccess = computed(() => {
  if (!currentMetrics.value?.step_metrics) return 0;
  return Object.values(currentMetrics.value.step_metrics).reduce(
    (sum, s) => sum + s.success_count,
    0,
  );
});

const totalFailure = computed(() => {
  if (!currentMetrics.value?.step_metrics) return 0;
  return Object.values(currentMetrics.value.step_metrics).reduce(
    (sum, s) => sum + s.failure_count,
    0,
  );
});

const errorRate = computed(() => {
  const total = totalRequests.value;
  if (total === 0) return '0';
  return ((totalFailure.value / total) * 100).toFixed(2);
});

const currentQps = computed(() => {
  if (timeSeriesData.value.length < 2) return '0';
  const len = timeSeriesData.value.length;
  const latest = timeSeriesData.value[len - 1]!;
  const prev = timeSeriesData.value[len - 2]!;
  const diff = latest.totalIterations - prev.totalIterations;
  return diff > 0 ? diff.toFixed(1) : '0';
});

// 步骤指标表格
const stepMetricsColumns = [
  { title: '步骤', dataIndex: 'step_id', key: 'step_id', width: 200 },
  { title: '请求数', dataIndex: 'count', key: 'count', width: 100 },
  { title: '成功', dataIndex: 'success_count', key: 'success_count', width: 100 },
  { title: '失败', dataIndex: 'failure_count', key: 'failure_count', width: 100 },
  { title: 'Avg', dataIndex: 'avg', key: 'avg', width: 100 },
  { title: 'P50', dataIndex: 'p50', key: 'p50', width: 100 },
  { title: 'P90', dataIndex: 'p90', key: 'p90', width: 100 },
  { title: 'P95', dataIndex: 'p95', key: 'p95', width: 100 },
  { title: 'P99', dataIndex: 'p99', key: 'p99', width: 100 },
];

const stepMetricsData = computed(() => {
  if (!currentMetrics.value?.step_metrics) return [];
  return Object.entries(currentMetrics.value.step_metrics).map(
    ([key, s]: [string, StepMetrics]) => ({
      key,
      step_id: s.step_id || key,
      count: s.count,
      success_count: s.success_count,
      failure_count: s.failure_count,
      avg: s.duration?.avg || '-',
      p50: s.duration?.p50 || '-',
      p90: s.duration?.p90 || '-',
      p95: s.duration?.p95 || '-',
      p99: s.duration?.p99 || '-',
    }),
  );
});

onMounted(async () => {
  await loadData();
  if (isRunning.value) {
    startPolling();
  } else {
    await fetchMetricsOnce();
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
      try {
        workflow.value = await getWorkflowApi(exec.workflow_id);
      } catch {
        // 工作流可能已删除
      }
    }
  } catch {
    message.error('加载执行详情失败');
  } finally {
    loading.value = false;
  }
}

async function fetchMetricsOnce() {
  if (!executionId.value) return;
  try {
    const metrics = await getExecutionMetricsApi(executionId.value);
    currentMetrics.value = metrics;
    appendTimePoint(metrics);
    renderAllCharts();
  } catch {
    // 已完成的执行可能没有实时指标
  }
}

function startPolling() {
  stopPolling();
  pollTimer.value = setInterval(async () => {
    if (!executionId.value) return;
    try {
      const [exec, metrics] = await Promise.all([
        getExecutionApi(executionId.value),
        getExecutionMetricsApi(executionId.value),
      ]);
      execution.value = exec;
      currentMetrics.value = metrics;
      appendTimePoint(metrics);
      updateAllCharts();

      if (!isRunning.value) {
        stopPolling();
      }
    } catch {
      // ignore polling errors
    }
  }, 1000);
}

function stopPolling() {
  if (pollTimer.value) {
    clearInterval(pollTimer.value);
    pollTimer.value = null;
  }
}

function appendTimePoint(metrics: ExecutionMetrics) {
  const now = new Date().toLocaleTimeString('zh-CN', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  let successCount = 0;
  let failureCount = 0;
  if (metrics.step_metrics) {
    for (const s of Object.values(metrics.step_metrics)) {
      successCount += s.success_count;
      failureCount += s.failure_count;
    }
  }

  timeSeriesData.value.push({
    time: now,
    totalIterations: metrics.total_iterations,
    totalVUs: metrics.total_vus,
    successCount,
    failureCount,
  });

  // 最多保留 300 个点（5分钟 @1s）
  if (timeSeriesData.value.length > 300) {
    timeSeriesData.value.shift();
  }
}

function getTimeLabels() {
  return timeSeriesData.value.map((p) => p.time);
}

function getQpsSeries() {
  const data = timeSeriesData.value;
  return data.map((p, i) => {
    if (i === 0) return 0;
    return Math.max(0, p.totalIterations - data[i - 1]!.totalIterations);
  });
}

function getVuSeries() {
  return timeSeriesData.value.map((p) => p.totalVUs);
}

function getErrorRateSeries() {
  return timeSeriesData.value.map((p) => {
    const total = p.successCount + p.failureCount;
    if (total === 0) return 0;
    return Number(((p.failureCount / total) * 100).toFixed(2));
  });
}

function getIterationsSeries() {
  return timeSeriesData.value.map((p) => p.totalIterations);
}

const baseChartOption = {
  grid: { top: 30, right: 16, bottom: 24, left: 50, containLabel: false },
  tooltip: { trigger: 'axis' as const },
  xAxis: {
    type: 'category' as const,
    boundaryGap: false,
    axisLabel: { fontSize: 10 },
  },
  yAxis: {
    type: 'value' as const,
    splitLine: { lineStyle: { type: 'dashed' as const } },
    axisLabel: { fontSize: 10 },
  },
};

function renderAllCharts() {
  const labels = getTimeLabels();

  renderQps({
    ...baseChartOption,
    xAxis: { ...baseChartOption.xAxis, data: labels },
    series: [
      {
        name: 'QPS',
        type: 'line',
        smooth: true,
        data: getQpsSeries(),
        areaStyle: { opacity: 0.15 },
        itemStyle: { color: '#1890ff' },
      },
    ],
  });

  renderRt({
    ...baseChartOption,
    xAxis: { ...baseChartOption.xAxis, data: labels },
    series: [
      {
        name: '迭代总数',
        type: 'line',
        smooth: true,
        data: getIterationsSeries(),
        areaStyle: { opacity: 0.15 },
        itemStyle: { color: '#52c41a' },
      },
    ],
  });

  renderVu({
    ...baseChartOption,
    xAxis: { ...baseChartOption.xAxis, data: labels },
    series: [
      {
        name: '并发用户数',
        type: 'line',
        smooth: true,
        data: getVuSeries(),
        areaStyle: { opacity: 0.15 },
        itemStyle: { color: '#722ed1' },
      },
    ],
  });

  renderError({
    ...baseChartOption,
    xAxis: { ...baseChartOption.xAxis, data: labels },
    yAxis: { ...baseChartOption.yAxis, axisLabel: { ...baseChartOption.yAxis.axisLabel, formatter: '{value}%' } },
    series: [
      {
        name: '错误率',
        type: 'line',
        smooth: true,
        data: getErrorRateSeries(),
        areaStyle: { opacity: 0.15 },
        itemStyle: { color: '#ff4d4f' },
      },
    ],
  });
}

function updateAllCharts() {
  const labels = getTimeLabels();

  updateQps({
    xAxis: { data: labels },
    series: [{ data: getQpsSeries() }],
  });

  updateRt({
    xAxis: { data: labels },
    series: [{ data: getIterationsSeries() }],
  });

  updateVu({
    xAxis: { data: labels },
    series: [{ data: getVuSeries() }],
  });

  updateError({
    xAxis: { data: labels },
    series: [{ data: getErrorRateSeries() }],
  });
}

// 初始化图表
watch(
  () => timeSeriesData.value.length,
  (len) => {
    if (len === 1) {
      renderAllCharts();
    }
  },
);

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
  if (ms < 60_000) return `${(ms / 1000).toFixed(2)}s`;
  return `${(ms / 60_000).toFixed(2)}min`;
}
</script>

<template>
  <Page title="压测报告" :description="workflow?.name || `执行ID: ${executionId}`">
    <template #extra>
      <Space>
        <Popconfirm
          v-if="isRunning"
          title="确定停止执行？"
          @confirm="handleStop"
        >
          <Button danger :loading="stopping">停止执行</Button>
        </Popconfirm>
        <Button @click="handleBack">返回</Button>
      </Space>
    </template>

    <Spin :spinning="loading">
      <div class="report-container">
        <!-- 状态栏 -->
        <div class="status-bar">
          <Space size="large" align="center">
            <Tag :color="statusColor" class="status-tag">
              {{ statusText }}
            </Tag>
            <span v-if="isRunning" class="running-indicator" />
            <span class="duration-text">
              {{ currentMetrics?.duration || formatDuration(execution?.duration) }}
            </span>
          </Space>
        </div>

        <!-- 统计卡片 -->
        <div class="stats-grid">
          <Card class="stat-card" :bordered="false">
            <Statistic
              title="QPS (req/s)"
              :value="currentQps"
              :value-style="{ color: '#1890ff', fontSize: '28px' }"
            />
          </Card>
          <Card class="stat-card" :bordered="false">
            <Statistic
              title="总请求数"
              :value="totalRequests"
              :value-style="{ fontSize: '28px' }"
            />
          </Card>
          <Card class="stat-card" :bordered="false">
            <Statistic
              title="并发用户 (VUs)"
              :value="currentMetrics?.total_vus || 0"
              :value-style="{ color: '#722ed1', fontSize: '28px' }"
            />
          </Card>
          <Card class="stat-card" :bordered="false">
            <Statistic
              title="成功数"
              :value="totalSuccess"
              :value-style="{ color: '#52c41a', fontSize: '28px' }"
            />
          </Card>
          <Card class="stat-card" :bordered="false">
            <Statistic
              title="失败数"
              :value="totalFailure"
              :value-style="{ color: '#ff4d4f', fontSize: '28px' }"
            />
          </Card>
          <Card class="stat-card" :bordered="false">
            <Statistic
              title="错误率"
              :value="errorRate"
              suffix="%"
              :value-style="{
                color: Number(errorRate) > 0 ? '#ff4d4f' : '#52c41a',
                fontSize: '28px',
              }"
            />
          </Card>
        </div>

        <!-- 实时图表 -->
        <div class="charts-grid">
          <Card title="QPS (每秒请求数)" :bordered="false" size="small">
            <EchartsUI ref="qpsChartRef" height="220px" />
          </Card>
          <Card title="迭代总数" :bordered="false" size="small">
            <EchartsUI ref="rtChartRef" height="220px" />
          </Card>
          <Card title="并发用户数 (VUs)" :bordered="false" size="small">
            <EchartsUI ref="vuChartRef" height="220px" />
          </Card>
          <Card title="错误率 (%)" :bordered="false" size="small">
            <EchartsUI ref="errorChartRef" height="220px" />
          </Card>
        </div>

        <!-- 步骤指标 -->
        <Card
          v-if="stepMetricsData.length > 0"
          title="步骤指标"
          :bordered="false"
          class="step-metrics-card"
        >
          <Table
            :columns="stepMetricsColumns"
            :data-source="stepMetricsData"
            :pagination="false"
            size="small"
            :scroll="{ x: 900 }"
          />
        </Card>

        <!-- 执行详情 -->
        <Card title="执行详情" :bordered="false" class="detail-card">
          <Descriptions :column="2" size="small">
            <Descriptions.Item label="执行ID">
              {{ execution?.execution_id }}
            </Descriptions.Item>
            <Descriptions.Item label="工作流">
              {{ workflow?.name || execution?.workflow_id }}
            </Descriptions.Item>
            <Descriptions.Item label="环境ID">
              {{ execution?.env_id }}
            </Descriptions.Item>
            <Descriptions.Item label="执行模式">
              <Tag color="green">执行</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="开始时间">
              {{ formatDate(execution?.start_time) }}
            </Descriptions.Item>
            <Descriptions.Item label="结束时间">
              {{ formatDate(execution?.end_time) }}
            </Descriptions.Item>
            <Descriptions.Item label="总耗时">
              {{ formatDuration(execution?.duration) }}
            </Descriptions.Item>
            <Descriptions.Item label="总迭代">
              {{ currentMetrics?.total_iterations || 0 }}
            </Descriptions.Item>
          </Descriptions>
        </Card>

        <!-- 最终报告结果 -->
        <Card
          v-if="!isRunning && execution?.result"
          title="执行结果"
          :bordered="false"
          class="result-card"
        >
          <pre class="result-content">{{ execution.result }}</pre>
        </Card>
      </div>
    </Spin>
  </Page>
</template>

<style scoped>
.report-container {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.status-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-radius: 8px;
  background: var(--ant-color-fill-quaternary, #fafafa);
}

.status-tag {
  font-size: 14px;
  padding: 4px 12px;
}

.running-indicator {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #52c41a;
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.3;
  }
}

.duration-text {
  font-size: 14px;
  font-weight: 500;
  color: var(--ant-color-text-secondary);
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 12px;
}

.stat-card {
  text-align: center;
}

.stat-card :deep(.ant-statistic-title) {
  font-size: 12px;
}

.charts-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.step-metrics-card {
  overflow: hidden;
}

.result-content {
  background: var(--ant-color-fill-quaternary, #f5f5f5);
  padding: 12px;
  border-radius: 4px;
  max-height: 300px;
  overflow: auto;
  font-family: monospace;
  font-size: 12px;
  white-space: pre-wrap;
  word-break: break-all;
}

@media (max-width: 1200px) {
  .stats-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (max-width: 768px) {
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .charts-grid {
    grid-template-columns: 1fr;
  }
}
</style>
