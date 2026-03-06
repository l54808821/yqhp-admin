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
// variables 统一存储所有变量，环境变量以 "env." 前缀区分
export interface VariableSnapshotInfo {
  variables: Record<string, unknown>;
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

// ============ 多模态消息 ContentPart（OpenAI 兼容格式，用于发送给 LLM） ============

export type MultimodalContentPart =
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string; detail?: string } }
  | { type: 'input_audio'; input_audio: { url: string; format?: string } }
  | { type: 'video_url'; video_url: { url: string } }
  | { type: 'file_url'; file_url: { url: string; name?: string } };

export type AttachmentType = 'image' | 'audio' | 'video' | 'file';

export interface ChatAttachment {
  id: string;
  file?: File;
  url?: string;
  dataUrl?: string;
  name: string;
  size: number;
  mimeType: string;
  type: AttachmentType;
  status: 'uploading' | 'done' | 'error';
  error?: string;
}

// ============ ContentBlock 多模态消息系统 ============

export type ContentBlockType =
  | 'text'
  | 'thinking'
  | 'image'
  | 'file'
  | 'tool_call'
  | 'plan'
  | 'step_exec'
  | 'error';

export interface TextBlock {
  type: 'text';
  id: string;
  content: string;
}

export interface ThinkingBlock {
  type: 'thinking';
  id: string;
  content: string;
  isComplete: boolean;
}

export interface ImageBlock {
  type: 'image';
  id: string;
  url: string;
  name?: string;
}

export interface FileBlock {
  type: 'file';
  id: string;
  url: string;
  name: string;
  size?: number;
  mimeType?: string;
}

export interface ToolCallBlock {
  type: 'tool_call';
  id: string;
  name: string;
  arguments: string;
  result?: string;
  isError?: boolean;
  durationMs?: number;
  status: 'running' | 'completed' | 'error';
}

export interface PlanStepBlock {
  index: number;
  task: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  result?: string;
  error?: string;
  toolCalls?: ToolCallBlock[];
}

export interface PlanBlock {
  type: 'plan';
  id: string;
  reason: string;
  planText?: string;
  steps: PlanStepBlock[];
  synthesis?: string;
  status: 'planning' | 'executing' | 'completed' | 'failed';
}

export interface StepExecBlock {
  type: 'step_exec';
  id: string;
  stepId: string;
  stepName: string;
  stepType: string;
  status: 'running' | 'success' | 'failed' | 'skipped';
  durationMs?: number;
  result?: any;
  reason?: string;
}

export interface ErrorBlock {
  type: 'error';
  id: string;
  message: string;
}

export type ContentBlock =
  | TextBlock
  | ThinkingBlock
  | ImageBlock
  | FileBlock
  | ToolCallBlock
  | PlanBlock
  | StepExecBlock
  | ErrorBlock;

/**
 * Parse message content: if JSON array → ContentBlock[], otherwise wrap as single TextBlock.
 */
export function parseMessageContent(content: string): ContentBlock[] {
  if (!content) return [];
  const trimmed = content.trim();
  if (trimmed.startsWith('[')) {
    try {
      const blocks = JSON.parse(trimmed) as ContentBlock[];
      if (Array.isArray(blocks) && blocks.length > 0 && blocks[0]?.type) {
        return blocks;
      }
    } catch {
      // not valid JSON, fall through
    }
  }
  return [{ type: 'text', content }];
}

/**
 * Serialize ContentBlock[] to string for persistence.
 */
export function serializeBlocks(blocks: ContentBlock[]): string {
  if (!blocks || blocks.length === 0) return '';
  if (blocks.length === 1 && blocks[0]!.type === 'text') {
    return (blocks[0] as TextBlock).content;
  }
  return JSON.stringify(blocks);
}

/**
 * Extract plain text from blocks for display/search.
 */
export function blocksToPlainText(blocks: ContentBlock[]): string {
  return blocks
    .filter((b): b is TextBlock => b.type === 'text')
    .map((b) => b.content)
    .join('');
}

// ============ Agent 模式轨迹类型 ============

export interface ReActRound {
  round: number;
  thinking: string;
  tool_calls: ToolCallRecord[];
  reflection?: string;
}

export interface PlanStep {
  index: number;
  task: string;
  status: string;
  thinking?: string;
  result?: string;
  tool_calls?: ToolCallRecord[];
}

export interface PlanExecTrace {
  plan: string;
  plan_text?: string;
  reason?: string;
  steps: PlanStep[];
  synthesis?: string;
}

export interface ReflectionRound {
  round: number;
  draft: string;
  critique: string;
}

export interface ReflectionTrace {
  rounds: ReflectionRound[];
  final_answer?: string;
}

export interface AgentTrace {
  mode: string;
  react?: ReActRound[];
  plan_and_execute?: PlanExecTrace;
  plan?: PlanExecTrace;
  reflection?: ReflectionTrace;
}

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
  agentTrace?: AgentTrace;
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
