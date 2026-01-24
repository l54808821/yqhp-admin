/**
 * HTTP 响应共享类型定义
 */

// 处理器执行结果
export interface ProcessorResult {
  keywordId: string;
  type: string;
  name?: string;
  success: boolean;
  message?: string;
  output?: Record<string, unknown>;
  logs?: string[];
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

  // 处理器结果
  preProcessorResults?: ProcessorResult[];
  postProcessorResults?: ProcessorResult[];
  consoleLogs?: string[];
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
  preProcessorResults?: ProcessorResult[];
  postProcessorResults?: ProcessorResult[];
  assertionResults?: AssertionResult[];
  consoleLogs?: string[];
  actualRequest?: {
    url: string;
    method: string;
    headers: Record<string, string>;
    body?: string;
  };
  error?: string;
}

// 流程执行步骤输出类型（后端返回的格式，使用下划线命名）
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
  console_logs?: string[];
  pre_processor_results?: ProcessorResult[];
  post_processor_results?: ProcessorResult[];
}
