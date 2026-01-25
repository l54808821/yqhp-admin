import { requestClient } from '#/api/request';

// 调试会话状态
export type DebugSessionStatus = 'running' | 'completed' | 'success' | 'failed' | 'stopped' | 'timeout' | 'waiting_interaction';

// 执行模式
export type ExecutionMode = 'streaming' | 'blocking';

// 步骤状态
export type StepStatus = 'pending' | 'running' | 'success' | 'completed' | 'failed' | 'skipped' | 'timeout';

// 调试会话
export interface DebugSession {
  id: number;
  execution_id: string;
  project_id: number;
  workflow_id: number;
  env_id: number;
  mode: ExecutionMode;
  status: DebugSessionStatus;
  start_time?: string;
  end_time?: string;
  duration?: number;
  total_steps?: number;
  success_steps?: number;
  failed_steps?: number;
  result?: string;
  created_by?: number;
  created_at?: string;
}

// 流式执行请求参数
export interface RunStreamParams {
  env_id: number;
  variables?: Record<string, unknown>;
  timeout?: number;
  executor_type?: 'local' | 'remote';
  slave_id?: string;
  definition?: string;  // 工作流定义 JSON 字符串（用于调试未保存的工作流）
  selected_steps?: string[];  // 选中的步骤 ID（用于选择性调试）
}

// 阻塞式执行请求参数
export interface RunBlockingParams {
  env_id: number;
  variables?: Record<string, unknown>;
  timeout?: number;
  executor_type?: 'local' | 'remote';
  slave_id?: string;
}

// 执行汇总响应
export interface ExecutionSummary {
  session_id: string;
  total_steps: number;
  success_steps: number;
  failed_steps: number;
  total_duration_ms: number;
  status: string;
  start_time: string;
  end_time: string;
}

// 交互响应请求
export interface InteractionResponseParams {
  value: string;
  skipped: boolean;
}

// 步骤执行结果
export interface StepResult {
  step_id: string;
  step_name: string;
  step_type?: string;
  parent_id?: string;
  iteration?: number;
  status: StepStatus;
  duration_ms: number;
  output?: Record<string, unknown>;
  error?: string;
  logs?: string[];
  start_time?: string;
  end_time?: string;
}

// 进度数据
export interface ProgressData {
  current_step: number;
  total_steps: number;
  percentage: number;
  step_name: string;
}

// 调试汇总
export interface DebugSummary {
  session_id: string;
  total_steps: number;
  success_steps: number;
  failed_steps: number;
  total_duration_ms: number;
  status: DebugSessionStatus;
  step_results: StepResult[];
  start_time: string;
  end_time: string;
}

// SSE 事件类型
export type SSEEventType =
  | 'connected'
  | 'step_started'
  | 'step_completed'
  | 'step_failed'
  | 'progress'
  | 'execution_completed'
  | 'interaction_required'
  | 'error'
  | 'heartbeat';

// SSE 事件
export interface SSEEvent {
  event: SSEEventType;
  data: StepResult | ProgressData | DebugSummary | ErrorData | StepStartedData | InteractionData | ConnectedData;
}

// 连接成功数据
export interface ConnectedData {
  session_id: string;
  workflow_id: number;
  mode: ExecutionMode;
}

// 步骤开始数据
export interface StepStartedData {
  step_id: string;
  step_name: string;
  step_type?: string;
  parent_id?: string;
  iteration?: number;
}

// 交互请求数据
export interface InteractionData {
  step_id: string;
  step_name: string;
  prompt: string;
  input_type: 'text' | 'select' | 'confirm';
  options?: string[];
  default_value?: string;
  timeout?: number;
}

// 错误数据
export interface ErrorData {
  code: string;
  message: string;
  details?: string;
  recoverable?: boolean;
}

// ============ SSE API ============

/**
 * 阻塞式执行工作流
 * @param workflowId 工作流ID
 * @param params 执行参数
 */
export async function runBlockingApi(workflowId: number, params: RunBlockingParams) {
  return requestClient.post<ExecutionSummary>(`/workflows/${workflowId}/run`, params);
}

/**
 * 停止执行
 * @param sessionId 会话ID
 */
export async function stopExecutionApi(sessionId: string) {
  return requestClient.delete(`/executions/${sessionId}/stop`);
}

/**
 * 获取执行状态
 * @param sessionId 会话ID
 */
export async function getExecutionStatusApi(sessionId: string) {
  return requestClient.get<DebugSession>(`/executions/${sessionId}/status`);
}

/**
 * 提交交互响应
 * @param sessionId 会话ID
 * @param params 交互响应
 */
export async function submitInteractionApi(sessionId: string, params: InteractionResponseParams) {
  return requestClient.post(`/executions/${sessionId}/interaction`, params);
}

/**
 * 构建 SSE URL
 * @param workflowId 工作流ID
 * @param params 执行参数
 * @param token 认证 token（可选，用于 SSE 认证）
 */
export function buildSSEUrl(workflowId: number, params: RunStreamParams, token?: string): string {
  const apiUrl = import.meta.env.VITE_GLOB_API_URL || '';
  const searchParams = new URLSearchParams();

  searchParams.set('env_id', String(params.env_id));

  if (params.variables) {
    searchParams.set('variables', JSON.stringify(params.variables));
  }
  if (params.timeout) {
    searchParams.set('timeout', String(params.timeout));
  }
  if (params.executor_type) {
    searchParams.set('executor_type', params.executor_type);
  }
  if (params.slave_id) {
    searchParams.set('slave_id', params.slave_id);
  }
  // 添加工作流定义（用于调试未保存的工作流）
  if (params.definition) {
    searchParams.set('definition', params.definition);
  }
  // 添加选中的步骤 ID（用于选择性调试）
  if (params.selected_steps && params.selected_steps.length > 0) {
    searchParams.set('selected_steps', JSON.stringify(params.selected_steps));
  }
  // 添加认证 token（EventSource 不支持自定义 headers，需要通过 URL 参数传递）
  if (token) {
    searchParams.set('satoken', token);
  }

  const path = `/workflows/${workflowId}/run/stream?${searchParams.toString()}`;

  // 如果 API URL 是完整的 URL，拼接完整路径
  if (apiUrl.startsWith('http://') || apiUrl.startsWith('https://')) {
    return `${apiUrl}${path}`;
  }

  // 如果是相对路径，使用当前页面的 origin
  return `${window.location.origin}${apiUrl}${path}`;
}

// ============ 单步调试 API ============

// 单步调试请求参数
export interface DebugStepParams {
  nodeConfig: {
    id: string;
    type: string;
    name: string;
    config: Record<string, unknown>; // 通用配置，根据 type 不同内容不同
    preProcessors?: Array<{ id: string; type: string; enabled: boolean; name?: string; config: Record<string, unknown> }>;
    postProcessors?: Array<{ id: string; type: string; enabled: boolean; name?: string; config: Record<string, unknown> }>;
  };
  envId?: number;
  variables?: Record<string, unknown>;
  sessionId?: string;  // 调试会话 ID，用于获取会话变量
}

// 脚本执行结果
export interface ScriptResult {
  script: string;
  language: string;
  result?: unknown;
  consoleLogs: ConsoleLogEntry[];
  error?: string;
  variables: Record<string, unknown>;
  durationMs: number;
}

// 实际请求信息
export interface ActualRequest {
  url: string;
  method: string;
  headers: Record<string, string>;
  body?: string;
}

// 控制台日志条目
export interface ConsoleLogEntry {
  type: 'log' | 'warn' | 'error' | 'processor';
  message?: string;
  ts?: number;
  processor?: {
    id: string;
    phase: 'pre' | 'post';
    procType: string;
    name?: string;
    success: boolean;
    message?: string;
    output?: Record<string, unknown>;
  };
}

// HTTP 响应数据（统一格式）
export interface HttpResponseData {
  statusCode: number;
  statusText: string;
  duration: number;
  size: number;
  headers: Record<string, string>;
  cookies?: Record<string, string>;
  body: string;
  bodyType: string;
}

// 单步调试响应
export interface DebugStepResponse {
  success: boolean;
  response?: HttpResponseData;
  scriptResult?: ScriptResult;
  assertionResults?: Array<{
    name: string;
    passed: boolean;
    message?: string;
  }>;
  consoleLogs?: ConsoleLogEntry[];
  actualRequest?: ActualRequest;
  error?: string;
}

/**
 * 单步调试 HTTP 节点
 * @param params 调试参数
 */
export async function debugStepApi(params: DebugStepParams): Promise<DebugStepResponse> {
  return requestClient.post<DebugStepResponse>('/debug/step', params);
}
