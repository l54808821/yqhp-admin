/**
 * AI 节点共享类型定义
 */

export interface AIConfig {
  ai_model_id: number | null;
  ai_model_name: string;
  system_prompt: string;
  prompt: string;
  temperature: number;
  max_tokens: number;
  top_p: number;
  streaming: boolean;
  interactive: boolean;
  interaction_timeout: number;
  timeout: number;
  tools: string[];
  mcp_server_ids: number[];
  max_tool_rounds: number;
}

export interface AIStepNode {
  id: string;
  type: 'ai';
  name: string;
  config: AIConfig;
}

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
  { name: 'human_interaction', label: '人机交互工具', description: 'AI 主动请求用户确认、输入或选择' },
];

export function createDefaultAIConfig(): AIConfig {
  return {
    ai_model_id: null,
    ai_model_name: '',
    system_prompt: '',
    prompt: '',
    temperature: 0.7,
    max_tokens: 4096,
    top_p: 1,
    streaming: true,
    interactive: false,
    interaction_timeout: 300,
    timeout: 300,
    tools: [],
    mcp_server_ids: [],
    max_tool_rounds: 10,
  };
}
