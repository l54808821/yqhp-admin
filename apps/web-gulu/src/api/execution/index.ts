import { requestClient } from '#/api/request';
import type { PageResult } from '#/api/types';
import type { PerformanceConfig } from '#/api/workflow/performance';

// 执行模式
export type ExecutionMode = 'debug' | 'execute';

// 执行状态
export type ExecutionStatus = 'pending' | 'running' | 'completed' | 'failed' | 'stopped' | 'timeout';

// 来源类型
export type SourceTypeEnum = 'performance' | 'test_plan' | 'debug';

export interface Execution {
  id: number;
  created_at?: string;
  updated_at?: string;
  project_id: number;
  source_id: number;
  env_id: number;
  executor_id?: number;
  execution_id: string;
  mode?: ExecutionMode;
  source_type: SourceTypeEnum;
  title: string;
  status: ExecutionStatus;
  start_time?: string;
  end_time?: string;
  duration?: number;
  created_by?: number;
}

export interface CreateExecutionParams {
  source_id: number;
  env_id: number;
  executor_id?: number;
  mode?: ExecutionMode;
  performance_config?: PerformanceConfig;
}

export interface ExecutionListParams {
  page?: number;
  pageSize?: number;
  project_id?: number;
  source_id?: number;
  env_id?: number;
  status?: string;
}

// --- Realtime Metrics (from engine's MetricsEngine) ---

export interface StepMetricStats {
  step_id: string;
  step_name?: string;
  count: number;
  success_count: number;
  failure_count: number;
  avg_ms: number;
  min_ms: number;
  max_ms: number;
  p50_ms: number;
  p90_ms: number;
  p95_ms: number;
  p99_ms: number;
}

export interface RealtimeMetrics {
  status: string;
  elapsed_ms: number;
  total_vus: number;
  total_iterations: number;
  qps: number;
  error_rate: number;
  step_metrics?: Record<string, StepMetricStats>;
  errors?: string[];
}

// --- Final Report (from engine's Summary Output) ---

export interface ReportSummary {
  total_duration_ms: number;
  total_requests: number;
  success_requests: number;
  failed_requests: number;
  error_rate: number;
  avg_qps: number;
  peak_qps: number;
  avg_response_time_ms: number;
  min_response_time_ms: number;
  max_response_time_ms: number;
  p50_response_time_ms: number;
  p90_response_time_ms: number;
  p95_response_time_ms: number;
  p99_response_time_ms: number;
  max_vus: number;
  total_iterations: number;
  throughput_bytes_per_sec: number;
  total_data_sent: number;
  total_data_received: number;
  thresholds_pass_rate: number;
}

export interface TimeSeriesPoint {
  timestamp: string;
  elapsed_ms: number;
  qps: number;
  avg_rt_ms: number;
  p50_rt_ms: number;
  p90_rt_ms: number;
  p95_rt_ms: number;
  p99_rt_ms: number;
  active_vus: number;
  error_rate: number;
  iterations: number;
  data_sent_per_sec: number;
  data_received_per_sec: number;
}

export interface StepDetailReport {
  step_id: string;
  step_name?: string;
  step_type?: string;
  count: number;
  success_count: number;
  failure_count: number;
  error_rate: number;
  avg_ms: number;
  min_ms: number;
  max_ms: number;
  p50_ms: number;
  p90_ms: number;
  p95_ms: number;
  p99_ms: number;
}

export interface ThresholdResult {
  metric: string;
  expression: string;
  passed: boolean;
  actual_value: number;
}

export interface ErrorAnalysis {
  total_errors: number;
  error_types: { type: string; count: number; percentage: number }[];
  top_errors: { message: string; step_id?: string; count: number; first_seen: string; last_seen: string }[];
}

export interface VUTimelineEvent {
  timestamp: string;
  elapsed_ms: number;
  vus: number;
  source: string;
  reason?: string;
}

export interface PerformanceTestReport {
  execution_id: string;
  workflow_id: string;
  workflow_name: string;
  start_time: string;
  end_time: string;
  status: string;
  summary: ReportSummary;
  time_series: TimeSeriesPoint[];
  step_details: StepDetailReport[];
  thresholds: ThresholdResult[];
  error_analysis: ErrorAnalysis;
  vu_timeline: VUTimelineEvent[];
}

// --- Sample Logs ---

export type SampleLogStatus = 'success' | 'failed' | 'timeout';

export interface SampleLog {
  id: number;
  execution_id: string;
  step_id: string;
  step_name?: string;
  timestamp: string;
  status: SampleLogStatus;
  duration_ms: number;
  request_method: string;
  request_url: string;
  request_headers?: Record<string, string>;
  request_body?: string;
  response_status?: number;
  response_headers?: Record<string, string>;
  response_body?: string;
  error_message?: string;
}

export interface SampleLogQuery {
  page?: number;
  pageSize?: number;
  step_id?: string;
  status?: string;
  keyword?: string;
}

// Legacy compat alias
export type ExecutionMetrics = RealtimeMetrics;

/**
 * 创建执行
 */
export async function createExecutionApi(params: CreateExecutionParams) {
  return requestClient.post<Execution>('/execution-records', params);
}

/**
 * 获取执行记录列表
 */
export async function getExecutionListApi(params?: ExecutionListParams) {
  return requestClient.get<PageResult<Execution>>('/execution-records', { params });
}

/**
 * 获取执行详情
 */
export async function getExecutionApi(id: number) {
  return requestClient.get<Execution>(`/execution-records/${id}`);
}

/**
 * 停止执行
 */
export async function stopExecutionApi(id: number) {
  return requestClient.delete(`/execution-records/${id}`);
}

/**
 * 获取执行实时指标
 */
export async function getExecutionMetricsApi(id: number) {
  return requestClient.get<ExecutionMetrics>(`/execution-records/${id}/metrics`);
}

/**
 * 暂停执行
 */
export async function pauseExecutionApi(id: number) {
  return requestClient.post(`/execution-records/${id}/pause`);
}

/**
 * 恢复执行
 */
export async function resumeExecutionApi(id: number) {
  return requestClient.post(`/execution-records/${id}/resume`);
}

// --- Performance Testing APIs ---

/**
 * 获取实时指标快照
 */
export async function getRealtimeMetricsApi(id: number) {
  return requestClient.get<RealtimeMetrics>(`/execution-records/${id}/realtime`);
}

/**
 * 获取最终性能报告
 */
export async function getPerformanceReportApi(id: number) {
  return requestClient.get<PerformanceTestReport>(`/execution-records/${id}/report`);
}

/**
 * 获取时序数据
 */
export async function getTimeSeriesApi(id: number) {
  return requestClient.get<TimeSeriesPoint[]>(`/execution-records/${id}/timeseries`);
}

/**
 * 调整 VU 数量
 */
export async function scaleVUsApi(id: number, vus: number) {
  return requestClient.post(`/execution-records/${id}/scale`, { vus });
}

/**
 * 获取采样日志
 */
export async function getSampleLogsApi(id: number, params?: SampleLogQuery) {
  return requestClient.get<PageResult<SampleLog>>(`/execution-records/${id}/sample-logs`, { params });
}

/**
 * 创建 SSE 连接获取实时指标流
 */
export function createMetricsStream(
  id: number,
  baseUrl: string,
  token: string,
  onMetrics: (data: RealtimeMetrics) => void,
  onReport: (data: PerformanceTestReport) => void,
  onComplete: (status: string) => void,
  onError?: (error: string) => void,
): EventSource {
  const url = `${baseUrl}/api/execution-records/${id}/metrics/stream`;
  const eventSource = new EventSource(`${url}?token=${token}`);

  eventSource.addEventListener('metrics', (event) => {
    try {
      const data = JSON.parse(event.data) as RealtimeMetrics;
      onMetrics(data);
    } catch { /* ignore parse errors */ }
  });

  eventSource.addEventListener('report', (event) => {
    try {
      const data = JSON.parse(event.data) as PerformanceTestReport;
      onReport(data);
    } catch { /* ignore */ }
  });

  eventSource.addEventListener('complete', (event) => {
    try {
      const data = JSON.parse(event.data);
      onComplete(data.status);
    } catch { /* ignore */ }
    eventSource.close();
  });

  eventSource.addEventListener('error', (event) => {
    if (onError && event instanceof MessageEvent) {
      onError(event.data);
    }
  });

  return eventSource;
}
