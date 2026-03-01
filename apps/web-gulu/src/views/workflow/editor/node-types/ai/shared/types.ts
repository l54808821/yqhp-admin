/**
 * 统一 AI Agent 类型定义
 */

// 基础 AI 配置
export interface BaseAIConfig {
  ai_model_id: number | null;
  ai_model_name: string;
  system_prompt: string;
  prompt: string;
  temperature: number;
  max_tokens: number;
  top_p: number;
  streaming: boolean;
  timeout: number;
}

// 统一 Agent 配置
export interface UnifiedAgentConfig extends BaseAIConfig {
  tools: string[];
  mcp_server_ids: number[];
  skill_ids: number[];
  knowledge_base_ids: number[];
  kb_top_k: number;
  kb_score_threshold: number;
  max_tool_rounds: number;
  interactive: boolean;
  interaction_timeout: number;
  enable_plan_mode: boolean;
  max_plan_steps: number;
}

// 内置工具定义
export interface BuiltinTool {
  name: string;
  label: string;
  description: string;
}

export const builtinTools: BuiltinTool[] = [
  { name: 'http_request', label: 'HTTP 请求工具', description: '发送 HTTP 请求到指定 URL' },
  { name: 'var_read', label: '变量读取工具', description: '从工作流上下文读取变量' },
  { name: 'var_write', label: '变量写入工具', description: '向工作流上下文写入变量' },
  { name: 'json_parse', label: 'JSON 解析工具', description: '解析 JSON 字符串并提取数据' },
];

export function createDefaultUnifiedAgentConfig(): UnifiedAgentConfig {
  return {
    ai_model_id: null,
    ai_model_name: '',
    system_prompt: '',
    prompt: '',
    temperature: 0.7,
    max_tokens: 4096,
    top_p: 1,
    streaming: true,
    timeout: 300,
    tools: [],
    mcp_server_ids: [],
    skill_ids: [],
    knowledge_base_ids: [],
    kb_top_k: 5,
    kb_score_threshold: 0.7,
    max_tool_rounds: 15,
    interactive: false,
    interaction_timeout: 300,
    enable_plan_mode: true,
    max_plan_steps: 10,
  };
}

// --- 兼容旧类型的别名（方便残留引用编译通过）---
export type ChatConfig = UnifiedAgentConfig;
export type AgentConfig = UnifiedAgentConfig;
export type PlanExecuteConfig = UnifiedAgentConfig;
export type ReflectionConfig = UnifiedAgentConfig;
export type SupervisorConfig = UnifiedAgentConfig;
export type DeepAgentConfig = UnifiedAgentConfig;
export type AINodeType = 'ai_agent';
export type AnyAIConfig = UnifiedAgentConfig;

export const createDefaultChatConfig = createDefaultUnifiedAgentConfig;
export const createDefaultAgentConfig = createDefaultUnifiedAgentConfig;
export const createDefaultPlanExecuteConfig = createDefaultUnifiedAgentConfig;
export const createDefaultReflectionConfig = createDefaultUnifiedAgentConfig;
export const createDefaultSupervisorConfig = createDefaultUnifiedAgentConfig;
export const createDefaultDeepAgentConfig = createDefaultUnifiedAgentConfig;
