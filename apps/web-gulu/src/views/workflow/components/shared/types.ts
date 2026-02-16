/**
 * HTTP 响应共享类型定义
 * 统一使用驼峰命名（camelCase）
 */

// 控制台日志类型
export type ConsoleLogType = 'log' | 'warn' | 'error' | 'processor' | 'variable' | 'snapshot';

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

// 变量变更信息
export interface VariableChangeInfo {
  name: string;
  oldValue?: unknown;
  newValue: unknown;
  scope: 'env' | 'temp';
  source: string; // set_variable | extract_param | js_script | loop
}

// 变量快照信息
export interface VariableSnapshotInfo {
  envVars: Record<string, unknown>;
  tempVars: Record<string, unknown>;
}

// 统一的控制台日志条目
export interface ConsoleLogEntry {
  type: ConsoleLogType;
  message?: string;
  ts?: number;
  processor?: ProcessorLogInfo;
  variable?: VariableChangeInfo;
  snapshot?: VariableSnapshotInfo;
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

// 统一的脚本响应数据结构（camelCase）
export interface ScriptResponseData {
  // 脚本信息
  script?: string;
  language?: string;

  // 执行结果
  result?: unknown;
  durationMs: number; // 毫秒
  error?: string;

  // 变量（脚本执行后的变量状态）
  variables?: Record<string, unknown>;

  // 控制台日志
  consoleLogs?: ConsoleLogEntry[];

  // 断言结果（如果有）
  assertions?: AssertionResult[];

  // 由前端补充的状态字段
  success?: boolean;
}

// 工具调用记录
export interface ToolCallRecord {
  round: number;
  tool_name: string;
  arguments: string;
  result: string;
  is_error: boolean;
  duration_ms: number;
}

// 统一的 AI 响应数据结构（camelCase）
export interface AIResponseData {
  success: boolean;
  content: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  durationMs: number;
  error?: string;
  toolCalls?: ToolCallRecord[];
  systemPrompt?: string;
  prompt?: string;
  finishReason?: string;
}

// 统一的数据库响应数据结构（camelCase）
export interface DatabaseResponseData {
  // 执行状态
  success: boolean;
  action: string; // query | execute | count | exists
  durationMs: number; // 毫秒

  // 查询结果（query 操作）
  data?: Record<string, unknown>[];
  columns?: string[];
  rowCount?: number;

  // 执行结果（execute 操作）
  rowsAffected?: number;

  // count 结果
  count?: number;

  // exists 结果
  exists?: boolean;

  // 实际执行的 SQL（变量替换后）
  actualSql?: string;

  // 错误信息
  error?: string;

  // 控制台日志
  consoleLogs?: ConsoleLogEntry[];
  assertions?: AssertionResult[];
}

// 单步调试 API 响应类型（后端返回的格式）
export interface DebugStepApiResponse {
  success: boolean;
  response?: HttpResponseData;
  scriptResult?: ScriptResponseData;
  assertionResults?: AssertionResult[];
  consoleLogs?: ConsoleLogEntry[];
  actualRequest?: ActualRequest;
  error?: string;
}
