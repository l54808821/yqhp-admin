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
  skill_ids: number[];
  max_tool_rounds: number;
  knowledge_base_ids: number[];
  kb_top_k: number;
  kb_score_threshold: number;
  enable_plan_mode: boolean;
  max_plan_steps: number;
  tool_timeout: number;
  // Fallback 配置
  fallback_models: FallbackModel[];
}

export interface FallbackModel {
  provider: string;
  model: string;
  api_key: string;
  base_url: string;
}

export interface AIStepNode {
  id: string;
  type: 'ai_agent';
  name: string;
  config: AIConfig;
  postProcessors?: import('../../types').KeywordConfig[];
}

export interface BuiltinTool {
  name: string;
  label: string;
  description: string;
  category: 'basic' | 'web' | 'code' | 'interaction';
}

export const builtinTools: BuiltinTool[] = [
  // 基础工具
  { name: 'http_request', label: 'HTTP 请求', description: '发送 HTTP 请求到指定 URL，支持 GET/POST/PUT/DELETE/PATCH', category: 'basic' },
  { name: 'var_read', label: '变量读取', description: '从工作流上下文读取变量', category: 'basic' },
  { name: 'var_write', label: '变量写入', description: '向工作流上下文写入变量', category: 'basic' },
  { name: 'json_parse', label: 'JSON 解析', description: '解析 JSON 字符串并提取数据', category: 'basic' },
  // 联网工具
  { name: 'web_search', label: '联网搜索', description: '在互联网上搜索信息，获取最新数据和事实', category: 'web' },
  { name: 'web_fetch', label: '网页抓取', description: '获取指定 URL 的网页内容（文章、文档等）', category: 'web' },
  // 代码执行
  { name: 'code_execute', label: '代码执行', description: '执行 Python / JavaScript 代码，用于计算和数据处理', category: 'code' },
  // 交互
  { name: 'human_interaction', label: '人机交互', description: 'AI 主动请求用户确认、输入或选择', category: 'interaction' },
];

export const toolCategoryLabels: Record<string, string> = {
  basic: '基础工具',
  web: '联网工具',
  code: '代码执行',
  interaction: '交互工具',
};

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
    tools: ['web_search', 'web_fetch', 'code_execute'],
    mcp_server_ids: [],
    skill_ids: [],
    max_tool_rounds: 15,
    knowledge_base_ids: [],
    kb_top_k: 5,
    kb_score_threshold: 0.7,
    enable_plan_mode: true,
    max_plan_steps: 10,
    tool_timeout: 180,
    fallback_models: [],
  };
}
