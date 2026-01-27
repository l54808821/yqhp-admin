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

// ============ 统一执行 API ============

// 步骤配置（单步执行快捷方式）
export interface StepConfig {
  id: string;
  type: string;
  name: string;
  config: Record<string, any>;  // 使用 any 以兼容不同的配置类型
  preProcessors?: ProcessorConfig[];
  postProcessors?: ProcessorConfig[];
}

// 处理器配置
export interface ProcessorConfig {
  id: string;
  type: string;
  enabled: boolean;
  name?: string;
  config: Record<string, any>;  // 使用 any 以兼容不同的配置类型
}

// 统一执行请求参数
export interface ExecuteParams {
  // 工作流定义（完整工作流）
  workflow?: Record<string, unknown>;
  // 单步快捷方式：传入单个步骤，自动包装为工作流
  step?: StepConfig;
  // 环境 ID
  envId: number;
  // 变量
  variables?: Record<string, unknown>;
  // 执行模式：debug（失败即停止）或 normal（继续执行）
  mode?: 'debug' | 'normal';
  // 会话 ID
  sessionId?: string;
  // 选中的步骤 ID
  selectedSteps?: string[];
  // 超时时间（秒）
  timeout?: number;
  // 执行器类型
  executorType?: 'local' | 'remote';
  // 指定的 Slave ID
  slaveId?: string;
  // 是否使用 SSE 流式响应
  stream?: boolean;
  // 是否持久化执行记录
  persist?: boolean;
}

// 统一执行响应（阻塞模式）
export interface ExecuteResponse {
  success: boolean;
  executionId?: string;
  sessionId?: string;
  summary?: ExecutionSummary;
  error?: string;
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
/**
 * 步骤执行结果（统一格式）
 */
export interface StepExecutionResult {
  stepId: string;
  stepName: string;
  stepType: string;
  success: boolean;
  durationMs: number;
  result?: Record<string, any>; // HTTPResponseData / ScriptResponseData / 其他
  error?: string;
}

/**
 * 执行汇总响应（统一格式，SSE 和阻塞模式返回相同结构）
 */
export interface ExecuteResponse {
  session_id: string;
  total_steps: number;
  success_steps: number;
  failed_steps: number;
  total_duration_ms: number;
  status: string; // success, failed, timeout, stopped
  start_time?: string;
  end_time?: string;
  steps?: StepExecutionResult[]; // 步骤执行详情
}

/**
 * 旧版调试响应（保持兼容）
 * @deprecated 使用 ExecuteResponse 替代
 */
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
 * 统一执行接口（支持单步和流程执行，阻塞模式）
 * 返回统一的 ExecuteResponse 格式，包含步骤详情
 * @param params 执行参数
 */
export async function executeApi(params: ExecuteParams): Promise<ExecuteResponse> {
  return requestClient.post<ExecuteResponse>('/execute', params);
}

/**
 * SSE 执行回调
 */
export interface SSEExecuteCallbacks {
  onConnected?: (sessionId: string) => void;
  onStepStarted?: (stepId: string, stepName: string) => void;
  onStepCompleted?: (data: StepCompletedResult) => void;
  onWorkflowCompleted?: (data: WorkflowCompletedResult) => void;
  onError?: (error: string) => void;
}

/**
 * 步骤完成结果
 */
export interface StepCompletedResult {
  stepId: string;
  stepName: string;
  stepType: string;
  success: boolean;
  durationMs: number;
  result?: Record<string, unknown>;
}

/**
 * 工作流完成结果
 */
export interface WorkflowCompletedResult {
  sessionId: string;
  status: string;
  totalSteps: number;
  successSteps: number;
  failedSteps: number;
  durationMs: number;
}

/**
 * SSE 执行控制器
 */
export interface SSEExecuteController {
  stop: () => void;
}

/**
 * SSE 方式执行（支持单步和流程执行，实时事件推送）
 * @param params 执行参数
 * @param callbacks 事件回调
 * @returns 控制器，可用于停止执行
 */
export function executeWithSSE(
  params: ExecuteParams,
  callbacks: SSEExecuteCallbacks,
  token?: string,
): SSEExecuteController {
  const apiUrl = import.meta.env.VITE_GLOB_API_URL || '';
  const baseUrl = apiUrl.startsWith('http')
    ? apiUrl
    : `${window.location.origin}${apiUrl}`;
  const url = `${baseUrl}/execute`;

  let abortController: AbortController | null = new AbortController();

  // 强制使用 SSE
  const requestBody = { ...params, stream: true };

  // 使用传入的 token
  const authToken = token || '';

  // 使用 fetch + ReadableStream 处理 SSE
  fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'text/event-stream',
      'satoken': authToken,
    },
    body: JSON.stringify(requestBody),
    signal: abortController.signal,
  })
    .then(async (response) => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('无法读取响应流');
      }

      const decoder = new TextDecoder();
      let buffer = '';

      let currentEventType = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('event: ')) {
            // 保存事件类型
            currentEventType = line.slice(7).trim();
          } else if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              handleSSEEvent(currentEventType, data, callbacks);
            } catch {
              // 忽略解析错误
            }
          }
        }
      }
    })
    .catch((error) => {
      if (error.name !== 'AbortError') {
        callbacks.onError?.(error.message || '执行失败');
      }
    });

  return {
    stop: () => {
      abortController?.abort();
      abortController = null;
    },
  };
}

/**
 * 处理 SSE 事件
 * @param eventType 事件类型（从 event: 行解析）
 * @param data 事件数据（从 data: 行解析）
 */
function handleSSEEvent(eventType: string, data: Record<string, unknown>, callbacks: SSEExecuteCallbacks) {
  switch (eventType) {
    case 'connected':
      callbacks.onConnected?.((data.session_id || data.sessionId) as string);
      break;
    case 'step_started':
      callbacks.onStepStarted?.(
        (data.stepId || data.step_id) as string,
        (data.stepName || data.step_name) as string,
      );
      break;
    case 'step_completed':
      callbacks.onStepCompleted?.({
        stepId: (data.stepId || data.step_id) as string,
        stepName: (data.stepName || data.step_name) as string,
        stepType: (data.stepType || data.step_type) as string,
        success: data.success as boolean,
        durationMs: (data.durationMs || data.duration_ms) as number,
        result: data.result as Record<string, unknown>,
      });
      break;
    case 'workflow_completed':
      callbacks.onWorkflowCompleted?.({
        sessionId: (data.sessionId || data.session_id) as string,
        status: data.status as string,
        totalSteps: (data.totalSteps || data.total_steps) as number,
        successSteps: (data.successSteps || data.success_steps) as number,
        failedSteps: (data.failedSteps || data.failed_steps) as number,
        durationMs: (data.durationMs || data.duration_ms) as number,
      });
      break;
    case 'error':
      callbacks.onError?.(data.message as string);
      break;
  }
}
