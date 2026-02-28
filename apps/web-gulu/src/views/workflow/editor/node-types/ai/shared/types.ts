/**
 * AI 节点共享类型定义
 */

// 所有 AI 节点共享的基础配置
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

// ai_chat 配置
export interface ChatConfig extends BaseAIConfig {
  tools?: string[];
  mcp_server_ids?: number[];
  skill_ids?: number[];
}

// ai_agent 配置
export interface AgentConfig extends BaseAIConfig {
  tools: string[];
  mcp_server_ids: number[];
  skill_ids: number[];
  knowledge_base_ids: number[];
  kb_top_k: number;
  kb_score_threshold: number;
  max_tool_rounds: number;
  interactive: boolean;
  interaction_timeout: number;
  hitl_enabled: boolean;
  hitl_approve_tools: string[];
}

// ai_plan_execute 配置
export interface PlanExecuteConfig extends BaseAIConfig {
  planner_prompt: string;
  executor_tools: string[];
  executor_mcp_server_ids: number[];
  executor_skill_ids: number[];
  max_plan_steps: number;
  enable_replanner: boolean;
  hitl_approve_plan: boolean;
}

// ai_reflection 配置
export interface ReflectionConfig extends BaseAIConfig {
  critique_prompt: string;
  improve_prompt: string;
  max_reflection_rounds: number;
}

// ai_supervisor 配置
export interface SupervisorConfig extends BaseAIConfig {
  sub_agent_node_ids: string[];
  max_iterations: number;
  hitl_enabled: boolean;
}

// ai_deep_agent 配置
export interface DeepAgentConfig extends BaseAIConfig {
  sub_agent_node_ids: string[];
  max_iterations: number;
}

// AI 节点类型
export type AINodeType = 'ai_chat' | 'ai_agent' | 'ai_plan_execute' | 'ai_reflection' | 'ai_supervisor' | 'ai_deep_agent';

// 所有 AI 配置的联合类型
export type AnyAIConfig = ChatConfig | AgentConfig | PlanExecuteConfig | ReflectionConfig | SupervisorConfig | DeepAgentConfig;

// AI 步骤节点（通用）
export interface AIStepNode<T extends AnyAIConfig = AnyAIConfig> {
  id: string;
  type: AINodeType;
  name: string;
  config: T;
  postProcessors?: import('../../types').KeywordConfig[];
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

// 创建默认配置
export function createDefaultChatConfig(): ChatConfig {
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
  };
}

export function createDefaultAgentConfig(): AgentConfig {
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
    max_tool_rounds: 10,
    interactive: false,
    interaction_timeout: 300,
    hitl_enabled: false,
    hitl_approve_tools: [],
  };
}

export function createDefaultPlanExecuteConfig(): PlanExecuteConfig {
  return {
    ai_model_id: null,
    ai_model_name: '',
    system_prompt: '',
    prompt: '',
    temperature: 0.7,
    max_tokens: 4096,
    top_p: 1,
    streaming: true,
    timeout: 600,
    planner_prompt: '',
    executor_tools: [],
    executor_mcp_server_ids: [],
    executor_skill_ids: [],
    max_plan_steps: 10,
    enable_replanner: true,
    hitl_approve_plan: false,
  };
}

export function createDefaultReflectionConfig(): ReflectionConfig {
  return {
    ai_model_id: null,
    ai_model_name: '',
    system_prompt: '',
    prompt: '',
    temperature: 0.7,
    max_tokens: 4096,
    top_p: 1,
    streaming: true,
    timeout: 600,
    critique_prompt: '',
    improve_prompt: '',
    max_reflection_rounds: 3,
  };
}

export function createDefaultSupervisorConfig(): SupervisorConfig {
  return {
    ai_model_id: null,
    ai_model_name: '',
    system_prompt: '',
    prompt: '',
    temperature: 0.7,
    max_tokens: 4096,
    top_p: 1,
    streaming: true,
    timeout: 900,
    sub_agent_node_ids: [],
    max_iterations: 20,
    hitl_enabled: false,
  };
}

export function createDefaultDeepAgentConfig(): DeepAgentConfig {
  return {
    ai_model_id: null,
    ai_model_name: '',
    system_prompt: '',
    prompt: '',
    temperature: 0.7,
    max_tokens: 4096,
    top_p: 1,
    streaming: true,
    timeout: 900,
    sub_agent_node_ids: [],
    max_iterations: 100,
  };
}
