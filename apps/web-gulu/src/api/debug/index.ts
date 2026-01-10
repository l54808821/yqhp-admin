import { requestClient } from '#/api/request';

// 调试会话状态
export type DebugSessionStatus = 'running' | 'completed' | 'success' | 'failed' | 'stopped' | 'timeout';

// 执行模式
export type ExecutionMode = 'debug' | 'execute';

// 步骤状态
export type StepStatus = 'pending' | 'running' | 'success' | 'completed' | 'failed' | 'skipped';

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

// 开始调试请求参数
export interface StartDebugParams {
  env_id: number;
  variables?: Record<string, unknown>;
  timeout?: number; // 超时时间（秒）
}

// 开始调试响应
export interface StartDebugResponse {
  session_id: string;
  websocket_url: string;
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

// WebSocket 消息类型
export type WSMessageType =
  | 'connected'
  | 'step_started'
  | 'step_completed'
  | 'step_failed'
  | 'progress'
  | 'debug_completed'
  | 'error'
  | 'ping'
  | 'pong';

// WebSocket 消息
export interface WSMessage {
  type: WSMessageType;
  session_id: string;
  timestamp: string;
  data?: StepResult | ProgressData | DebugSummary | ErrorData | StepStartedData;
}

// 步骤开始数据
export interface StepStartedData {
  step_id: string;
  step_name: string;
  step_type?: string;
  parent_id?: string;
  iteration?: number;
}

// 错误数据
export interface ErrorData {
  code: string;
  message: string;
  details?: string;
}

/**
 * 开始调试
 * @param workflowId 工作流ID
 * @param params 调试参数
 */
export async function startDebugApi(workflowId: number, params: StartDebugParams) {
  return requestClient.post<StartDebugResponse>(`/workflows/${workflowId}/debug`, params);
}

/**
 * 停止调试
 * @param sessionId 会话ID
 */
export async function stopDebugApi(sessionId: string) {
  return requestClient.delete(`/debug/${sessionId}`);
}

/**
 * 获取调试会话详情
 * @param sessionId 会话ID
 */
export async function getDebugSessionApi(sessionId: string) {
  return requestClient.get<DebugSession>(`/debug/${sessionId}`);
}

/**
 * 获取调试会话列表
 * @param workflowId 工作流ID（可选）
 */
export async function getDebugSessionsApi(workflowId?: number) {
  const params = workflowId ? { workflow_id: workflowId } : {};
  return requestClient.get<DebugSession[]>('/debug/sessions', { params });
}

/**
 * 构建 WebSocket URL
 * @param sessionId 会话ID
 */
export function buildWebSocketUrl(sessionId: string): string {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const apiUrl = import.meta.env.VITE_GLOB_API_URL || '';

  // 如果 API URL 是完整的 URL（包含 http:// 或 https://），提取 host
  if (apiUrl.startsWith('http://') || apiUrl.startsWith('https://')) {
    const url = new URL(apiUrl);
    return `${protocol}//${url.host}/ws/debug/${sessionId}`;
  }

  // 如果是相对路径（如 /api），使用当前页面的 host
  return `${protocol}//${window.location.host}/ws/debug/${sessionId}`;
}
