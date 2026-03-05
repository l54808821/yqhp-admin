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

export type AINodeType = 'ai_agent' | 'ai_react' | 'ai_plan' | 'ai_direct';

export interface AIStepNode {
  id: string;
  type: AINodeType;
  name: string;
  config: AIConfig;
  postProcessors?: import('../../types').KeywordConfig[];
}

export interface BuiltinTool {
  name: string;
  label: string;
  description: string;
  category: 'basic' | 'web' | 'code' | 'file' | 'interaction';
}

export const builtinTools: BuiltinTool[] = [
  // 基础工具
  { name: 'http_request', label: 'HTTP 请求', description: '发送 HTTP 请求到指定 URL，支持 GET/POST/PUT/DELETE/PATCH', category: 'basic' },
  { name: 'var_read', label: '变量读取', description: '从工作流上下文读取变量', category: 'basic' },
  { name: 'var_write', label: '变量写入', description: '向工作流上下文写入变量', category: 'basic' },
  { name: 'json_parse', label: 'JSON 解析', description: '解析 JSON 字符串并提取数据', category: 'basic' },
  // 联网工具
  { name: 'bing_search', label: 'Bing 搜索', description: '使用 Bing 搜索引擎搜索互联网信息，适合中文搜索', category: 'web' },
  { name: 'google_search', label: 'Google 搜索', description: '使用 Google 搜索引擎搜索互联网信息（需要能访问 Google）', category: 'web' },
  { name: 'web_fetch', label: '网页抓取', description: '获取指定 URL 的网页内容（文章、文档等）', category: 'web' },
  // 代码执行
  { name: 'code_execute', label: '代码执行', description: '执行 Python / JavaScript 代码，用于计算和数据处理', category: 'code' },
  { name: 'shell_exec', label: '命令行执行', description: '在服务器上执行 Shell 命令（bash），适用于系统管理、文件操作、CLI 工具调用', category: 'code' },
  // 文件操作
  { name: 'read_file', label: '读取文件', description: '读取指定路径的文件内容，支持按行读取', category: 'file' },
  { name: 'write_file', label: '写入文件', description: '将内容写入指定路径的文件，自动创建目录', category: 'file' },
  { name: 'edit_file', label: '编辑文件', description: '查找并替换文件中的指定文本', category: 'file' },
  { name: 'append_file', label: '追加文件', description: '在文件末尾追加内容', category: 'file' },
  { name: 'list_dir', label: '列出目录', description: '列出指定目录下的文件和子目录', category: 'file' },
  // 交互
  { name: 'human_interaction', label: '人机交互', description: 'AI 主动请求用户确认、输入或选择', category: 'interaction' },
];

export const toolCategoryLabels: Record<string, string> = {
  basic: '基础工具',
  web: '联网工具',
  code: '代码执行',
  file: '文件操作',
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
    tools: ['bing_search', 'web_fetch', 'code_execute'],
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
