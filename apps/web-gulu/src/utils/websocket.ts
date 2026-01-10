import type { WSMessage } from '#/api/debug';

// WebSocket 连接状态
export type WebSocketState = 'connecting' | 'connected' | 'disconnected' | 'reconnecting' | 'error';

// WebSocket 配置
export interface WebSocketConfig {
  url: string;
  maxReconnectAttempts?: number;
  reconnectInterval?: number;
  heartbeatInterval?: number;
  heartbeatTimeout?: number;
  onMessage?: (message: WSMessage) => void;
  onStateChange?: (state: WebSocketState) => void;
  onError?: (error: Event) => void;
}

// 默认配置
const DEFAULT_CONFIG = {
  maxReconnectAttempts: 3,
  reconnectInterval: 3000,
  heartbeatInterval: 30000,
  heartbeatTimeout: 10000,
};

/**
 * WebSocket 服务类
 */
export class WebSocketService {
  private ws: WebSocket | null = null;
  private config: Required<WebSocketConfig>;
  private state: WebSocketState = 'disconnected';
  private reconnectAttempts = 0;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private heartbeatTimeoutTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private manualClose = false;

  constructor(config: WebSocketConfig) {
    this.config = {
      ...DEFAULT_CONFIG,
      ...config,
      onMessage: config.onMessage || (() => {}),
      onStateChange: config.onStateChange || (() => {}),
      onError: config.onError || (() => {}),
    };
  }

  /**
   * 连接 WebSocket
   */
  connect(): void {
    if (this.ws && (this.ws.readyState === WebSocket.CONNECTING || this.ws.readyState === WebSocket.OPEN)) {
      console.warn('WebSocket is already connected or connecting');
      return;
    }

    this.manualClose = false;
    this.setState('connecting');

    try {
      this.ws = new WebSocket(this.config.url);
      this.setupEventHandlers();
    } catch (error) {
      console.error('Failed to create WebSocket:', error);
      this.setState('error');
      this.scheduleReconnect();
    }
  }

  /**
   * 断开连接
   */
  disconnect(): void {
    this.manualClose = true;
    this.cleanup();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.setState('disconnected');
  }

  /**
   * 发送消息
   */
  send(data: unknown): boolean {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn('WebSocket is not connected');
      return false;
    }

    try {
      const message = typeof data === 'string' ? data : JSON.stringify(data);
      this.ws.send(message);
      return true;
    } catch (error) {
      console.error('Failed to send message:', error);
      return false;
    }
  }

  /**
   * 发送 ping
   */
  sendPing(): void {
    this.send({ type: 'ping' });
  }

  /**
   * 获取当前状态
   */
  getState(): WebSocketState {
    return this.state;
  }

  /**
   * 是否已连接
   */
  isConnected(): boolean {
    return this.state === 'connected' && this.ws?.readyState === WebSocket.OPEN;
  }

  /**
   * 设置事件处理器
   */
  private setupEventHandlers(): void {
    if (!this.ws) return;

    this.ws.onopen = () => {
      console.log('WebSocket connected');
      this.reconnectAttempts = 0;
      this.setState('connected');
      this.startHeartbeat();
    };

    this.ws.onmessage = (event) => {
      try {
        const message: WSMessage = JSON.parse(event.data);

        // 处理 pong 消息
        if (message.type === 'pong') {
          this.clearHeartbeatTimeout();
          return;
        }

        this.config.onMessage(message);
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      this.config.onError(error);
      this.setState('error');
    };

    this.ws.onclose = (event) => {
      console.log('WebSocket closed:', event.code, event.reason);
      this.cleanup();

      if (!this.manualClose) {
        this.scheduleReconnect();
      } else {
        this.setState('disconnected');
      }
    };
  }

  /**
   * 设置状态
   */
  private setState(state: WebSocketState): void {
    if (this.state !== state) {
      this.state = state;
      this.config.onStateChange(state);
    }
  }

  /**
   * 启动心跳
   */
  private startHeartbeat(): void {
    this.stopHeartbeat();

    this.heartbeatTimer = setInterval(() => {
      if (this.isConnected()) {
        this.sendPing();
        this.startHeartbeatTimeout();
      }
    }, this.config.heartbeatInterval);
  }

  /**
   * 停止心跳
   */
  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    this.clearHeartbeatTimeout();
  }

  /**
   * 启动心跳超时检测
   */
  private startHeartbeatTimeout(): void {
    this.clearHeartbeatTimeout();

    this.heartbeatTimeoutTimer = setTimeout(() => {
      console.warn('Heartbeat timeout, reconnecting...');
      this.ws?.close();
    }, this.config.heartbeatTimeout);
  }

  /**
   * 清除心跳超时
   */
  private clearHeartbeatTimeout(): void {
    if (this.heartbeatTimeoutTimer) {
      clearTimeout(this.heartbeatTimeoutTimer);
      this.heartbeatTimeoutTimer = null;
    }
  }

  /**
   * 安排重连
   */
  private scheduleReconnect(): void {
    if (this.manualClose) return;

    if (this.reconnectAttempts >= this.config.maxReconnectAttempts) {
      console.error('Max reconnect attempts reached');
      this.setState('error');
      return;
    }

    this.reconnectAttempts++;
    this.setState('reconnecting');
    console.log(`Reconnecting... attempt ${this.reconnectAttempts}/${this.config.maxReconnectAttempts}`);

    this.reconnectTimer = setTimeout(() => {
      this.connect();
    }, this.config.reconnectInterval);
  }

  /**
   * 清理资源
   */
  private cleanup(): void {
    this.stopHeartbeat();

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }
}

/**
 * 创建 WebSocket 服务实例
 */
export function createWebSocketService(config: WebSocketConfig): WebSocketService {
  return new WebSocketService(config);
}
