/**
 * HTTP 响应共享类型定义
 * 统一使用驼峰命名（camelCase）
 */

// 控制台日志类型
export type ConsoleLogType = 'log' | 'warn' | 'error' | 'processor';

// 处理器日志详情
export interface ProcessorLogInfo {
  id: string;
  phase: 'pre' | 'post';
  procType: string;
  name?: string;
  success: boolean;
  message?: string;
  output?: Record<string, unknown>;
}

// 统一的控制台日志条目
export interface ConsoleLogEntry {
  type: ConsoleLogType;
  message?: string;
  ts?: number;
  processor?: ProcessorLogInfo;
}

// 断言结果
export interface AssertionResult {
  id?: string;
  name: string;
  passed: boolean;
  message?: string;
  expected?: string;
  actual?: string;
}

// 实际请求信息
export interface ActualRequest {
  url: string;
  method: string;
  headers?: Record<string, string>;
  body?: string;
}

// 统一的 HTTP 响应数据结构（camelCase）
export interface HttpResponseData {
  // 响应状态
  statusCode: number;
  statusText?: string;
  duration: number; // 毫秒
  size: number; // 字节

  // 响应内容
  headers: Record<string, string | string[]>;
  cookies?: Record<string, string>;
  body: string;
  bodyType?: 'json' | 'xml' | 'html' | 'text' | 'binary';

  // 控制台日志（统一收集处理器执行结果和脚本日志）
  consoleLogs?: ConsoleLogEntry[];
  assertions?: AssertionResult[];

  // 实际请求（调试用）
  actualRequest?: ActualRequest;

  // 错误信息
  error?: string;
}

// 单步调试 API 响应类型（后端返回的格式）
export interface DebugStepApiResponse {
  success: boolean;
  response?: HttpResponseData;
  assertionResults?: AssertionResult[];
  consoleLogs?: ConsoleLogEntry[];
  actualRequest?: ActualRequest;
  error?: string;
}
