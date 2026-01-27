/**
 * SSE (Server-Sent Events) 服务
 * 用于替代 WebSocket 实现工作流调试的实时事件推送
 * 支持 GET (EventSource) 和 POST (fetch + ReadableStream) 两种方式
 */

// 从 api/debug 导入类型定义，避免重复
export type {
  SSEState,
  SSEEventType,
  SSEEvent,
  StepStartedData,
  StepSkippedData,
  ProgressData,
  WorkflowCompletedData,
  AIChunkData,
  AICompleteData,
  AIErrorData,
  AIInteractionData,
  InteractionType,
  InteractionOption,
  ErrorData,
} from '#/api/debug';

import type { SSEState, SSEEventType, SSEEvent } from '#/api/debug';

// SSE 配置
export interface SSEConfig {
  url: string;
  method?: 'GET' | 'POST';  // 请求方法，默认 GET
  body?: Record<string, unknown>;  // POST 请求体
  headers?: Record<string, string>;  // 自定义请求头
  onMessage?: (event: SSEEvent) => void;
  onStateChange?: (state: SSEState) => void;
  onError?: (error: Event | Error) => void;
  withCredentials?: boolean;
}

/**
 * SSE 服务类
 * 支持 GET (EventSource) 和 POST (fetch + ReadableStream) 两种方式
 */
export class SSEService {
  private eventSource: EventSource | null = null;
  private abortController: AbortController | null = null;
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
    if (this.eventSource || this.abortController) {
      console.warn('SSE is already connected');
      return;
    }

    this.setState('connecting');

    // 根据方法选择连接方式
    if (this.config.method === 'POST') {
      this.connectWithFetch();
    } else {
      this.connectWithEventSource();
    }
  }

  /**
   * 使用 EventSource 连接 (GET 方式)
   */
  private connectWithEventSource(): void {
    try {
      this.eventSource = new EventSource(this.config.url, {
        withCredentials: this.config.withCredentials ?? true,
      });

      this.setupEventSourceHandlers();
    } catch (error) {
      console.error('Failed to create EventSource:', error);
      this.setState('error');
    }
  }

  /**
   * 使用 fetch + ReadableStream 连接 (POST 方式)
   */
  private async connectWithFetch(): Promise<void> {
    this.abortController = new AbortController();

    try {
      const response = await fetch(this.config.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream',
          ...this.config.headers,
        },
        body: JSON.stringify(this.config.body || {}),
        signal: this.abortController.signal,
        credentials: this.config.withCredentials ? 'include' : 'same-origin',
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      if (!response.body) {
        throw new Error('Response body is null');
      }

      this.setState('connected');

      // 读取流
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          this.setState('disconnected');
          break;
        }

        buffer += decoder.decode(value, { stream: true });

        // 解析 SSE 格式的数据
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // 保留最后一个不完整的行

        let currentEvent = '';
        let currentData = '';

        for (const line of lines) {
          if (line.startsWith('event:')) {
            currentEvent = line.slice(6).trim();
          } else if (line.startsWith('data:')) {
            currentData = line.slice(5).trim();
          } else if (line === '' && currentData) {
            // 空行表示事件结束
            this.handleFetchMessage(currentEvent, currentData);
            currentEvent = '';
            currentData = '';
          }
        }
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('SSE fetch aborted');
        this.setState('disconnected');
      } else {
        console.error('SSE fetch error:', error);
        this.config.onError?.(error);
        this.setState('error');
      }
    }
  }

  /**
   * 处理 fetch 方式的消息
   */
  private handleFetchMessage(eventType: string, data: string): void {
    try {
      const parsed = JSON.parse(data);

      const sseEvent: SSEEvent = {
        type: (eventType || parsed.type) as SSEEventType,
        sessionId: parsed.sessionId,
        timestamp: parsed.timestamp,
        data: parsed.data,
      };

      // 保存会话ID
      if (sseEvent.sessionId && !this.sessionId) {
        this.sessionId = sseEvent.sessionId;
      }

      // 忽略心跳事件
      if (sseEvent.type === 'heartbeat') {
        return;
      }

      this.config.onMessage?.(sseEvent);
    } catch (error) {
      console.error('Failed to parse SSE message:', error, data);
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
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
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
    if (this.eventSource) {
      return this.state === 'connected' && this.eventSource.readyState === EventSource.OPEN;
    }
    return this.state === 'connected';
  }

  /**
   * 设置 EventSource 事件处理器
   */
  private setupEventSourceHandlers(): void {
    if (!this.eventSource) return;

    // 连接打开
    this.eventSource.onopen = () => {
      console.log('SSE connected');
      this.setState('connected');
    };

    // 通用消息处理（用于没有指定事件类型的消息）
    this.eventSource.onmessage = (event) => {
      this.handleEventSourceMessage(event);
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
      'step_skipped',
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
        this.handleEventSourceMessage(event as MessageEvent, eventType);
      });
    }
  }

  /**
   * 处理 EventSource 消息
   */
  private handleEventSourceMessage(event: MessageEvent, eventType?: SSEEventType): void {
    try {
      const data = JSON.parse(event.data);

      // 构建 SSE 事件对象
      const sseEvent: SSEEvent = {
        type: eventType || data.type,
        sessionId: data.sessionId,
        timestamp: data.timestamp,
        data: data.data,
      };

      // 保存会话ID
      if (sseEvent.sessionId && !this.sessionId) {
        this.sessionId = sseEvent.sessionId;
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
