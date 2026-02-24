<script setup lang="ts">
import type { EchartsUIType } from '@vben/plugins/echarts';

import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { Page } from '@vben/common-ui';
import { EchartsUI, useEcharts } from '@vben/plugins/echarts';

import {
  Alert,
  Button,
  Card,
  Descriptions,
  InputNumber,
  message,
  Popconfirm,
  Space,
  Spin,
  Statistic,
  Table,
  Tag,
  Tooltip,
} from 'ant-design-vue';

import type {
  Execution,
  PerformanceTestReport,
  RealtimeMetrics,
  StepMetricStats,
  TimeSeriesPoint,
} from '#/api/execution';

import {
  getExecutionApi,
  getPerformanceReportApi,
  getRealtimeMetricsApi,
  getTimeSeriesApi,
  scaleVUsApi,
  stopExecutionApi,
} from '#/api/execution';
import { getWorkflowApi } from '#/api/workflow';

const route = useRoute();
const router = useRouter();

const loading = ref(false);
const stopping = ref(false);
const scaling = ref(false);
const execution = ref<Execution | null>(null);
const workflow = ref<any>(null);
const pollTimer = ref<ReturnType<typeof setInterval> | null>(null);

// Realtime metrics from engine
const realtimeMetrics = ref<RealtimeMetrics | null>(null);

// Final report from engine
const finalReport = ref<PerformanceTestReport | null>(null);

// Time-series data (accumulated from SSE or polling)
const timeSeriesData = ref<TimeSeriesPoint[]>([]);

// VU control
const newVUs = ref(0);

const executionId = computed(() => Number(route.params.executionId));

// --- Status helpers ---

const isRunning = computed(() =>
  execution.value?.status === 'running' || execution.value?.status === 'pending',
);

const isCompleted = computed(() =>
  execution.value?.status === 'completed' || execution.value?.status === 'failed' || execution.value?.status === 'stopped',
);

const statusColor = computed(() => {
  const map: Record<string, string> = {
    pending: 'default',
    running: 'processing',
    completed: 'success',
    failed: 'error',
    stopped: 'warning',
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
  };
  return map[execution.value?.status || ''] || execution.value?.status || '';
});

// --- Charts ---

const qpsChartRef = ref<EchartsUIType>();
const rtChartRef = ref<EchartsUIType>();
const vuChartRef = ref<EchartsUIType>();
const errorChartRef = ref<EchartsUIType>();

const { renderEcharts: renderQps, updateDate: updateQps } = useEcharts(qpsChartRef);
const { renderEcharts: renderRt, updateDate: updateRt } = useEcharts(rtChartRef);
const { renderEcharts: renderVu, updateDate: updateVu } = useEcharts(vuChartRef);
const { renderEcharts: renderError, updateDate: updateError } = useEcharts(errorChartRef);

// --- Step metrics table ---

const stepMetricsColumns = [
  { title: '步骤', dataIndex: 'step_id', key: 'step_id', width: 200 },
  { title: '请求数', dataIndex: 'count', key: 'count', width: 80 },
  { title: '成功', dataIndex: 'success_count', key: 'success_count', width: 80 },
  { title: '失败', dataIndex: 'failure_count', key: 'failure_count', width: 80 },
  { title: '错误率', dataIndex: 'error_rate', key: 'error_rate', width: 80 },
  { title: 'Avg(ms)', dataIndex: 'avg_ms', key: 'avg_ms', width: 90 },
  { title: 'P50', dataIndex: 'p50_ms', key: 'p50_ms', width: 80 },
  { title: 'P90', dataIndex: 'p90_ms', key: 'p90_ms', width: 80 },
  { title: 'P95', dataIndex: 'p95_ms', key: 'p95_ms', width: 80 },
  { title: 'P99', dataIndex: 'p99_ms', key: 'p99_ms', width: 80 },
];

const stepMetricsData = computed(() => {
  if (isCompleted.value && finalReport.value?.step_details) {
    return finalReport.value.step_details.map((s) => ({
      key: s.step_id,
      ...s,
      avg_ms: s.avg_ms?.toFixed(1) ?? '-',
      p50_ms: s.p50_ms?.toFixed(1) ?? '-',
      p90_ms: s.p90_ms?.toFixed(1) ?? '-',
      p95_ms: s.p95_ms?.toFixed(1) ?? '-',
      p99_ms: s.p99_ms?.toFixed(1) ?? '-',
      error_rate: s.error_rate?.toFixed(2) + '%',
    }));
  }

  if (!realtimeMetrics.value?.step_metrics) return [];
  return Object.entries(realtimeMetrics.value.step_metrics).map(
    ([key, s]: [string, StepMetricStats]) => ({
      key,
      step_id: s.step_id || key,
      count: s.count,
      success_count: s.success_count,
      failure_count: s.failure_count,
      error_rate: s.count > 0 ? ((s.failure_count / s.count) * 100).toFixed(2) + '%' : '0%',
      avg_ms: s.avg_ms?.toFixed(1) ?? '-',
      p50_ms: s.p50_ms?.toFixed(1) ?? '-',
      p90_ms: s.p90_ms?.toFixed(1) ?? '-',
      p95_ms: s.p95_ms?.toFixed(1) ?? '-',
      p99_ms: s.p99_ms?.toFixed(1) ?? '-',
    }),
  );
});

// --- Lifecycle ---

onMounted(async () => {
  await loadData();
  if (isRunning.value) {
    startPolling();
  } else if (isCompleted.value) {
    await loadFinalReport();
  }
});

onUnmounted(() => {
  stopPolling();
});

async function loadData() {
  if (!executionId.value) return;
  try {
    loading.value = true;
    execution.value = await getExecutionApi(executionId.value);
    if (execution.value?.workflow_id) {
      try {
        workflow.value = await getWorkflowApi(execution.value.workflow_id);
      } catch { /* workflow may have been deleted */ }
    }
  } catch {
    message.error('加载执行详情失败');
  } finally {
    loading.value = false;
  }
}

async function loadFinalReport() {
  try {
    finalReport.value = await getPerformanceReportApi(executionId.value);
    if (finalReport.value?.time_series) {
      timeSeriesData.value = finalReport.value.time_series;
    }
    renderAllCharts();
  } catch { /* report may not be available yet */ }
}

function startPolling() {
  stopPolling();
  pollTimer.value = setInterval(async () => {
    if (!executionId.value) return;
    try {
      const [exec, metrics] = await Promise.all([
        getExecutionApi(executionId.value),
        getRealtimeMetricsApi(executionId.value),
      ]);
      execution.value = exec;
      realtimeMetrics.value = metrics;

      appendTimePoint(metrics);
      updateAllCharts();

      if (!isRunning.value) {
        stopPolling();
        await loadFinalReport();
      }
    } catch { /* ignore polling errors */ }
  }, 1000);
}

function stopPolling() {
  if (pollTimer.value) {
    clearInterval(pollTimer.value);
    pollTimer.value = null;
  }
}

function appendTimePoint(m: RealtimeMetrics) {
  timeSeriesData.value.push({
    timestamp: new Date().toISOString(),
    elapsed_ms: m.elapsed_ms,
    qps: m.qps,
    avg_rt_ms: 0,
    p50_rt_ms: 0,
    p90_rt_ms: 0,
    p95_rt_ms: 0,
    p99_rt_ms: 0,
    active_vus: m.total_vus,
    error_rate: m.error_rate,
    iterations: m.total_iterations,
  });
  if (timeSeriesData.value.length > 600) {
    timeSeriesData.value.shift();
  }
}

// --- Chart rendering ---

const baseChartOption = {
  grid: { top: 30, right: 16, bottom: 24, left: 50, containLabel: false },
  tooltip: { trigger: 'axis' as const },
  xAxis: { type: 'category' as const, boundaryGap: false, axisLabel: { fontSize: 10 } },
  yAxis: { type: 'value' as const, splitLine: { lineStyle: { type: 'dashed' as const } }, axisLabel: { fontSize: 10 } },
};

function getTimeLabels() {
  return timeSeriesData.value.map((p) => {
    const d = new Date(p.timestamp);
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}`;
  });
}

function renderAllCharts() {
  const labels = getTimeLabels();
  const qpsData = timeSeriesData.value.map((p) => p.qps);
  const vuData = timeSeriesData.value.map((p) => p.active_vus);
  const errorData = timeSeriesData.value.map((p) => p.error_rate);
  const rtData = timeSeriesData.value.map((p) => p.p95_rt_ms || p.avg_rt_ms);

  renderQps({ ...baseChartOption, xAxis: { ...baseChartOption.xAxis, data: labels }, series: [{ name: 'QPS', type: 'line', smooth: true, data: qpsData, areaStyle: { opacity: 0.15 }, itemStyle: { color: '#1890ff' } }] });
  renderRt({ ...baseChartOption, xAxis: { ...baseChartOption.xAxis, data: labels }, series: [{ name: 'P95 RT(ms)', type: 'line', smooth: true, data: rtData, areaStyle: { opacity: 0.15 }, itemStyle: { color: '#52c41a' } }] });
  renderVu({ ...baseChartOption, xAxis: { ...baseChartOption.xAxis, data: labels }, series: [{ name: 'VUs', type: 'line', smooth: true, data: vuData, areaStyle: { opacity: 0.15 }, itemStyle: { color: '#722ed1' } }] });
  renderError({ ...baseChartOption, xAxis: { ...baseChartOption.xAxis, data: labels }, yAxis: { ...baseChartOption.yAxis, axisLabel: { ...baseChartOption.yAxis.axisLabel, formatter: '{value}%' } }, series: [{ name: '错误率', type: 'line', smooth: true, data: errorData, areaStyle: { opacity: 0.15 }, itemStyle: { color: '#ff4d4f' } }] });
}

function updateAllCharts() {
  const labels = getTimeLabels();
  updateQps({ xAxis: { data: labels }, series: [{ data: timeSeriesData.value.map((p) => p.qps) }] });
  updateRt({ xAxis: { data: labels }, series: [{ data: timeSeriesData.value.map((p) => p.p95_rt_ms || p.avg_rt_ms) }] });
  updateVu({ xAxis: { data: labels }, series: [{ data: timeSeriesData.value.map((p) => p.active_vus) }] });
  updateError({ xAxis: { data: labels }, series: [{ data: timeSeriesData.value.map((p) => p.error_rate) }] });
}

// --- Actions ---

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

async function handleScaleVUs() {
  if (!executionId.value || newVUs.value < 1) return;
  try {
    scaling.value = true;
    await scaleVUsApi(executionId.value, newVUs.value);
    message.success(`VUs 已调整为 ${newVUs.value}`);
  } catch (e: any) {
    message.error(`调整失败: ${e?.message || '未知错误'}`);
  } finally {
    scaling.value = false;
  }
}

function handleBack() {
  router.back();
}

function formatDuration(ms?: number) {
  if (!ms) return '-';
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(2)}s`;
  return `${(ms / 60_000).toFixed(2)}min`;
}

watch(() => realtimeMetrics.value?.total_vus, (vus) => {
  if (vus && newVUs.value === 0) {
    newVUs.value = vus;
  }
});
</script>

<template>
  <Page title="性能测试报告" :description="workflow?.name || `执行ID: ${executionId}`">
    <template #extra>
      <Space>
        <Popconfirm v-if="isRunning" title="确定停止执行？" @confirm="handleStop">
          <Button danger :loading="stopping">终止压测</Button>
        </Popconfirm>
        <Button @click="handleBack">返回</Button>
      </Space>
    </template>

    <Spin :spinning="loading">
      <div class="report-container">
        <!-- Status Bar -->
        <div class="status-bar">
          <Space size="large" align="center">
            <Tag :color="statusColor" class="status-tag">{{ statusText }}</Tag>
            <span v-if="isRunning" class="running-indicator" />
            <span class="duration-text">
              {{ realtimeMetrics ? formatDuration(realtimeMetrics.elapsed_ms) : formatDuration(execution?.duration) }}
            </span>
          </Space>
        </div>

        <!-- VU Control Panel (only during execution) -->
        <Card v-if="isRunning" :bordered="false" size="small" class="vu-control-card">
          <Space align="center">
            <span style="font-weight: 500">并发用户调整:</span>
            <InputNumber v-model:value="newVUs" :min="1" :max="10000" style="width: 120px" />
            <Button type="primary" :loading="scaling" @click="handleScaleVUs">应用</Button>
            <span class="vu-hint">当前活跃: {{ realtimeMetrics?.total_vus || 0 }}</span>
          </Space>
        </Card>

        <!-- Summary Statistics -->
        <div class="stats-grid">
          <Card class="stat-card" :bordered="false">
            <Statistic title="QPS (req/s)" :value="isCompleted && finalReport ? finalReport.summary.avg_qps.toFixed(1) : (realtimeMetrics?.qps?.toFixed(1) || '0')" :value-style="{ color: '#1890ff', fontSize: '28px' }" />
          </Card>
          <Card class="stat-card" :bordered="false">
            <Statistic title="总请求数" :value="isCompleted && finalReport ? finalReport.summary.total_requests : (realtimeMetrics?.total_iterations || 0)" :value-style="{ fontSize: '28px' }" />
          </Card>
          <Card class="stat-card" :bordered="false">
            <Statistic title="并发用户" :value="isCompleted && finalReport ? finalReport.summary.max_vus : (realtimeMetrics?.total_vus || 0)" :value-style="{ color: '#722ed1', fontSize: '28px' }" />
          </Card>
          <Card class="stat-card" :bordered="false">
            <Statistic title="错误率" :value="isCompleted && finalReport ? finalReport.summary.error_rate.toFixed(2) : (realtimeMetrics?.error_rate?.toFixed(2) || '0')" suffix="%" :value-style="{ color: (realtimeMetrics?.error_rate || 0) > 0 ? '#ff4d4f' : '#52c41a', fontSize: '28px' }" />
          </Card>
          <template v-if="isCompleted && finalReport">
            <Card class="stat-card" :bordered="false">
              <Statistic title="Avg RT" :value="finalReport.summary.avg_response_time_ms.toFixed(1)" suffix="ms" :value-style="{ fontSize: '28px' }" />
            </Card>
            <Card class="stat-card" :bordered="false">
              <Statistic title="P95 RT" :value="finalReport.summary.p95_response_time_ms.toFixed(1)" suffix="ms" :value-style="{ fontSize: '28px' }" />
            </Card>
          </template>
        </div>

        <!-- Error Alert -->
        <Alert
          v-if="realtimeMetrics?.errors?.length || finalReport?.error_analysis?.total_errors"
          type="error"
          show-icon
          :message="`执行过程中产生了 ${finalReport?.error_analysis?.total_errors || realtimeMetrics?.errors?.length || 0} 个错误`"
        >
          <template #description>
            <ul class="error-list">
              <template v-if="finalReport?.error_analysis?.top_errors">
                <li v-for="(err, idx) in finalReport.error_analysis.top_errors.slice(0, 10)" :key="idx">
                  [{{ err.count }}x] {{ err.message }} <span v-if="err.step_id" class="error-step">({{ err.step_id }})</span>
                </li>
              </template>
              <template v-else-if="realtimeMetrics?.errors">
                <li v-for="(err, idx) in realtimeMetrics.errors.slice(0, 10)" :key="idx">{{ err }}</li>
              </template>
            </ul>
          </template>
        </Alert>

        <!-- Threshold Results (Final Report) -->
        <Card v-if="isCompleted && finalReport?.thresholds?.length" title="阈值评估" :bordered="false" size="small">
          <Space wrap>
            <Tag v-for="t in finalReport.thresholds" :key="t.metric" :color="t.passed ? 'success' : 'error'">
              {{ t.passed ? '✓' : '✗' }} {{ t.metric }}: {{ t.expression }} ({{ t.actual_value.toFixed(2) }})
            </Tag>
          </Space>
        </Card>

        <!-- Charts -->
        <div class="charts-grid">
          <Card title="QPS (每秒请求数)" :bordered="false" size="small">
            <EchartsUI ref="qpsChartRef" height="220px" />
          </Card>
          <Card title="响应时间 P95 (ms)" :bordered="false" size="small">
            <EchartsUI ref="rtChartRef" height="220px" />
          </Card>
          <Card title="并发用户数 (VUs)" :bordered="false" size="small">
            <EchartsUI ref="vuChartRef" height="220px" />
          </Card>
          <Card title="错误率 (%)" :bordered="false" size="small">
            <EchartsUI ref="errorChartRef" height="220px" />
          </Card>
        </div>

        <!-- Step Metrics Table -->
        <Card v-if="stepMetricsData.length > 0" title="步骤指标" :bordered="false" class="step-metrics-card">
          <Table
            :columns="stepMetricsColumns"
            :data-source="stepMetricsData"
            :pagination="false"
            size="small"
            :scroll="{ x: 950 }"
          />
        </Card>

        <!-- VU Timeline (Final Report) -->
        <Card v-if="isCompleted && finalReport?.vu_timeline?.length" title="VU 调度时间线" :bordered="false" size="small">
          <div class="vu-timeline">
            <div v-for="(event, idx) in finalReport.vu_timeline" :key="idx" class="vu-event">
              <Tag :color="event.source === 'manual' ? 'orange' : 'blue'">{{ event.source }}</Tag>
              <span>{{ formatDuration(event.elapsed_ms) }} → {{ event.vus }} VUs</span>
              <span v-if="event.reason" class="vu-reason">{{ event.reason }}</span>
            </div>
          </div>
        </Card>

        <!-- Execution Details -->
        <Card title="执行详情" :bordered="false" class="detail-card">
          <Descriptions :column="2" size="small">
            <Descriptions.Item label="执行ID">{{ execution?.execution_id }}</Descriptions.Item>
            <Descriptions.Item label="工作流">{{ workflow?.name || execution?.workflow_id }}</Descriptions.Item>
            <Descriptions.Item label="开始时间">{{ execution?.start_time ? new Date(execution.start_time).toLocaleString('zh-CN') : '-' }}</Descriptions.Item>
            <Descriptions.Item label="结束时间">{{ execution?.end_time ? new Date(execution.end_time).toLocaleString('zh-CN') : '-' }}</Descriptions.Item>
            <Descriptions.Item label="总耗时">{{ formatDuration(execution?.duration) }}</Descriptions.Item>
            <Descriptions.Item label="总迭代">{{ realtimeMetrics?.total_iterations || finalReport?.summary?.total_iterations || 0 }}</Descriptions.Item>
          </Descriptions>
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
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}

.duration-text {
  font-size: 14px;
  font-weight: 500;
  color: var(--ant-color-text-secondary);
}

.vu-control-card {
  background: var(--ant-color-fill-quaternary, #fafafa);
}

.vu-hint {
  font-size: 12px;
  color: var(--ant-color-text-secondary);
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
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

.error-list {
  margin: 0;
  padding-left: 20px;
  max-height: 150px;
  overflow: auto;
  font-size: 12px;
}

.error-list li {
  margin-bottom: 4px;
  word-break: break-all;
}

.error-step {
  color: var(--ant-color-text-secondary);
  font-size: 11px;
}

.vu-timeline {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.vu-event {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
}

.vu-reason {
  font-size: 12px;
  color: var(--ant-color-text-secondary);
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
