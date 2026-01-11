/**
 * SSE (Server-Sent Events) 服务
 * 用于替代 WebSocket 实现工作流调试的实时事件推送
 */

// SSE 连接状态
export type SSEState = 'connecting' | 'connected' | 'disconnected' | 'error';

// SSE 事件类型
export type SSEEventType =
  | 'connected'
  | 'step_started'
  | 'step_completed'
  | 'step_failed'
  | 'progress'
  | 'workflow_completed'
  | 'ai_chunk'
  | 'ai_complete'
  | 'ai_error'
  | 'ai_interaction_required'
  | 'heartbeat'
  | 'error';

// SSE 事件结构
export interface SSEEvent<T = unknown> {
  type: SSEEventType;
  session_id: string;
  timestamp: string;
  data: T;
}

// 步骤开始数据
export interface StepStartedData {
  step_id: string;
  step_name: string;
  step_type?: string;
  parent_id?: string;
  iteration?: number;
}

// 步骤完成数据
export interface StepCompletedData {
  step_id: string;
  step_name: string;
  step_type?: string;
  parent_id?: string;
  iteration?: number;
  status: string;
  duration_ms: number;
  output?: Record<string, unknown>;
}

// 步骤失败数据
export interface StepFailedData {
  step_id: string;
  step_name: string;
  step_type?: string;
  parent_id?: string;
  iteration?: number;
  error: string;
  details?: string;
  duration_ms: number;
}

// 进度数据
export interface ProgressData {
  current_step: number;
  total_steps: number;
  percentage: number;
  step_name: string;
}

// 工作流完成数据
export interface WorkflowCompletedData {
  session_id: string;
  total_steps: number;
  success_steps: number;
  failed_steps: number;
  total_duration_ms: number;
  status: string;
}

// AI 块数据
export interface AIChunkData {
  step_id: string;
  chunk: string;
  index: number;
}

// AI 完成数据
export interface AICompleteData {
  step_id: string;
  content: string;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

// AI 错误数据
export interface AIErrorData {
  step_id: string;
  error: string;
  details?: string;
}

// 交互类型
export type InteractionType = 'confirm' | 'input' | 'select';

// 交互选项
export interface InteractionOption {
  value: string;
  label: string;
}

// AI 交互数据
export interface AIInteractionData {
  step_id: string;
  type: InteractionType;
  prompt: string;
  options?: InteractionOption[];
  default_value?: string;
  timeout: number;
}

// 错误数据
export interface ErrorData {
  code: string;
  message: string;
  details?: string;
  recoverable: boolean;
}

// SSE 配置
export interface SSEConfig {
  url: string;
  onMessage?: (event: SSEEvent) => void;
  onStateChange?: (state: SSEState) => void;
  onError?: (error: Event) => void;
  withCredentials?: boolean;
}

/**
 * SSE 服务类
 */
export class SSEService {
  private eventSource: EventSource | null = null;
  private config: SSEConfig;
  private state: SSEState = 'disconnected';
  private sessionId: string | null = null;

  constructor(config: SSEConfig) {
    this.config = config;
  }

  /**
   * 连接 SSE
   */
  connect(): void {
    if (this.eventSource) {
      console.warn('SSE is already connected');
      return;
    }

    this.setState('connecting');

    try {
      this.eventSource = new EventSource(this.config.url, {
        withCredentials: this.config.withCredentials ?? true,
      });

      this.setupEventHandlers();
    } catch (error) {
      console.error('Failed to create EventSource:', error);
      this.setState('error');
    }
  }

  /**
   * 断开连接
   */
  disconnect(): void {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    this.sessionId = null;
    this.setState('disconnected');
  }

  /**
   * 获取当前状态
   */
  getState(): SSEState {
    return this.state;
  }

  /**
   * 获取会话ID
   */
  getSessionId(): string | null {
    return this.sessionId;
  }

  /**
   * 是否已连接
   */
  isConnected(): boolean {
    return this.state === 'connected' && this.eventSource?.readyState === EventSource.OPEN;
  }

  /**
   * 设置事件处理器
   */
  private setupEventHandlers(): void {
    if (!this.eventSource) return;

    // 连接打开
    this.eventSource.onopen = () => {
      console.log('SSE connected');
      this.setState('connected');
    };

    // 通用消息处理（用于没有指定事件类型的消息）
    this.eventSource.onmessage = (event) => {
      this.handleMessage(event);
    };

    // 错误处理
    this.eventSource.onerror = (error) => {
      console.error('SSE error:', error);
      this.config.onError?.(error);

      if (this.eventSource?.readyState === EventSource.CLOSED) {
        this.setState('disconnected');
      } else {
        this.setState('error');
      }
    };

    // 注册所有事件类型的监听器
    const eventTypes: SSEEventType[] = [
      'connected',
      'step_started',
      'step_completed',
      'step_failed',
      'progress',
      'workflow_completed',
      'ai_chunk',
      'ai_complete',
      'ai_error',
      'ai_interaction_required',
      'heartbeat',
      'error',
    ];

    for (const eventType of eventTypes) {
      this.eventSource.addEventListener(eventType, (event) => {
        this.handleMessage(event as MessageEvent, eventType);
      });
    }
  }

  /**
   * 处理消息
   */
  private handleMessage(event: MessageEvent, eventType?: SSEEventType): void {
    try {
      const data = JSON.parse(event.data);

      // 构建 SSE 事件对象
      const sseEvent: SSEEvent = {
        type: eventType || data.type,
        session_id: data.session_id,
        timestamp: data.timestamp,
        data: data.data,
      };

      // 保存会话ID
      if (sseEvent.session_id && !this.sessionId) {
        this.sessionId = sseEvent.session_id;
      }

      // 忽略心跳事件
      if (sseEvent.type === 'heartbeat') {
        return;
      }

      // 调用回调
      this.config.onMessage?.(sseEvent);
    } catch (error) {
      console.error('Failed to parse SSE message:', error, event.data);
    }
  }

  /**
   * 设置状态
   */
  private setState(state: SSEState): void {
    if (this.state !== state) {
      this.state = state;
      this.config.onStateChange?.(state);
    }
  }
}

/**
 * 创建 SSE 服务实例
 */
export function createSSEService(config: SSEConfig): SSEService {
  return new SSEService(config);
}

/**
 * 构建 SSE URL
 */
export function buildSSEUrl(
  workflowId: number | string,
  options: {
    envId: number | string;
    variables?: Record<string, unknown>;
    timeout?: number;
    executorType?: string;
    slaveId?: string;
  },
): string {
  const params = new URLSearchParams();
  params.set('env_id', String(options.envId));

  if (options.variables) {
    params.set('variables', JSON.stringify(options.variables));
  }
  if (options.timeout) {
    params.set('timeout', String(options.timeout));
  }
  if (options.executorType) {
    params.set('executor_type', options.executorType);
  }
  if (options.slaveId) {
    params.set('slave_id', options.slaveId);
  }

  return `/api/workflows/${workflowId}/run/stream?${params.toString()}`;
}
