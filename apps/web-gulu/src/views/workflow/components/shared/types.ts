/**
 * HTTP 响应共享类型定义
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

// 统一的 HTTP 响应数据结构
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
  actualRequest?: {
    url: string;
    method: string;
    headers: Record<string, string>;
    body?: string;
  };

  // 错误信息
  error?: string;
}

// 单步调试 API 响应类型（后端返回的格式）
export interface DebugStepApiResponse {
  success: boolean;
  response?: {
    statusCode: number;
    statusText: string;
    duration: number;
    size: number;
    headers: Record<string, string>;
    cookies?: Record<string, string>;
    body: string;
    bodyType: string;
  };
  assertionResults?: AssertionResult[];
  consoleLogs?: ConsoleLogEntry[];
  actualRequest?: {
    url: string;
    method: string;
    headers: Record<string, string>;
    body?: string;
  };
  error?: string;
}

// 流程执行步骤输出类型（后端返回的格式）
export interface StepResultOutput {
  status_code?: number;
  statusCode?: number;
  status?: string;
  body_raw?: string;
  body?: unknown;
  headers?: Record<string, string | string[]>;
  cookies?: Record<string, string>;
  request?: {
    method: string;
    url: string;
    headers?: Record<string, string>;
    body?: string;
  };
  assertions?: AssertionResult[];
  console_logs?: ConsoleLogEntry[];
}
