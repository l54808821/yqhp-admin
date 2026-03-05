import { requestClient } from '#/api/request';
import type { PageResult } from '#/api/types';

/** 预定义能力标签 */
export const CAPABILITY_TAG_OPTIONS = [
  '对话',
  'FIM',
  'Prefix',
  'Tools',
  '视觉',
  'MoE',
  'Math',
  'Coder',
  '推理',
  '语音',
  '联入',
  '生图',
  '视频',
  '重排序',
];

/** 预置模型信息 */
export interface PresetModel {
  model_id: string;
  name: string;
  context_length?: number;
  param_size?: string;
  capability_tags?: string[];
  description?: string;
}

/** 厂商预置配置 */
export interface ProviderPreset {
  name: string;
  provider_type: string;
  api_base_url: string;
  require_api_key: boolean;
  models: PresetModel[];
  icon?: string;
}

/** 厂商预置配置表 */
export const PROVIDER_PRESETS: Record<string, ProviderPreset> = {
  Ollama: {
    name: 'Ollama',
    provider_type: 'ollama',
    api_base_url: 'http://localhost:11434/v1',
    require_api_key: false,
    icon: 'ollama',
    models: [
      { model_id: 'llama3.1', name: 'Llama 3.1', param_size: '8B', context_length: 131072, capability_tags: ['对话', 'Tools'] },
      { model_id: 'qwen2.5', name: 'Qwen 2.5', param_size: '7B', context_length: 131072, capability_tags: ['对话', 'Coder', 'Math'] },
      { model_id: 'deepseek-r1', name: 'DeepSeek R1', param_size: '7B', context_length: 131072, capability_tags: ['对话', '推理'] },
      { model_id: 'codellama', name: 'Code Llama', param_size: '7B', context_length: 16384, capability_tags: ['对话', 'Coder', 'FIM'] },
      { model_id: 'gemma2', name: 'Gemma 2', param_size: '9B', context_length: 8192, capability_tags: ['对话'] },
      { model_id: 'mistral', name: 'Mistral', param_size: '7B', context_length: 32768, capability_tags: ['对话', 'Tools'] },
    ],
  },
  DeepSeek: {
    name: 'DeepSeek',
    provider_type: 'deepseek',
    api_base_url: 'https://api.deepseek.com/v1',
    require_api_key: true,
    icon: 'deepseek',
    models: [
      { model_id: 'deepseek-chat', name: 'DeepSeek-V3', context_length: 65536, capability_tags: ['对话', 'Tools', 'FIM', 'Prefix', 'Coder'], description: 'DeepSeek 最新对话模型，支持 64K 上下文' },
      { model_id: 'deepseek-reasoner', name: 'DeepSeek-R1', context_length: 65536, capability_tags: ['对话', '推理', 'Math', 'Coder'], description: 'DeepSeek 推理模型，擅长数学和复杂推理' },
    ],
  },
  '智谱AI': {
    name: '智谱AI',
    provider_type: 'zhipu',
    api_base_url: 'https://open.bigmodel.cn/api/paas/v4',
    require_api_key: true,
    icon: 'zhipu',
    models: [
      { model_id: 'glm-4-plus', name: 'GLM-4-Plus', context_length: 131072, capability_tags: ['对话', 'Tools', '推理'], description: 'GLM-4 旗舰版，128K 上下文' },
      { model_id: 'glm-4-flash', name: 'GLM-4-Flash', context_length: 131072, capability_tags: ['对话', 'Tools'], description: 'GLM-4 高速版，免费使用' },
      { model_id: 'glm-4v-plus', name: 'GLM-4V-Plus', context_length: 8192, capability_tags: ['对话', '视觉', 'Tools'], description: 'GLM-4 多模态版本，支持图像理解' },
      { model_id: 'glm-4-long', name: 'GLM-4-Long', context_length: 1048576, capability_tags: ['对话'], description: '支持 1M 超长上下文' },
    ],
  },
  Kimi: {
    name: 'Kimi',
    provider_type: 'kimi',
    api_base_url: 'https://api.moonshot.cn/v1',
    require_api_key: true,
    icon: 'kimi',
    models: [
      { model_id: 'moonshot-v1-8k', name: 'Kimi 8K', context_length: 8192, capability_tags: ['对话', 'Tools'], description: '月之暗面 Kimi，8K 上下文' },
      { model_id: 'moonshot-v1-32k', name: 'Kimi 32K', context_length: 32768, capability_tags: ['对话', 'Tools'], description: '月之暗面 Kimi，32K 上下文' },
      { model_id: 'moonshot-v1-128k', name: 'Kimi 128K', context_length: 131072, capability_tags: ['对话', 'Tools'], description: '月之暗面 Kimi，128K 上下文' },
    ],
  },
  '百度千帆': {
    name: '百度千帆',
    provider_type: 'baidu',
    api_base_url: 'https://qianfan.baidubce.com/v2',
    require_api_key: true,
    icon: 'baidu',
    models: [
      { model_id: 'ernie-4.0-8k', name: 'ERNIE 4.0', context_length: 8192, capability_tags: ['对话', 'Tools', '推理'], description: '百度文心一言旗舰模型' },
      { model_id: 'ernie-3.5-8k', name: 'ERNIE 3.5', context_length: 8192, capability_tags: ['对话', 'Tools'], description: '百度文心一言主力模型' },
      { model_id: 'ernie-speed-128k', name: 'ERNIE Speed', context_length: 131072, capability_tags: ['对话'], description: '高速推理，128K 上下文' },
    ],
  },
  '阿里通义': {
    name: '阿里通义',
    provider_type: 'aliyun',
    api_base_url: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    require_api_key: true,
    icon: 'aliyun',
    models: [
      { model_id: 'qwen-max', name: 'Qwen Max', context_length: 32768, capability_tags: ['对话', 'Tools', '推理', 'Coder'], description: '通义千问旗舰模型' },
      { model_id: 'qwen-plus', name: 'Qwen Plus', context_length: 131072, capability_tags: ['对话', 'Tools', 'Coder'], description: '通义千问增强版，128K 上下文' },
      { model_id: 'qwen-turbo', name: 'Qwen Turbo', context_length: 131072, capability_tags: ['对话', 'Tools'], description: '通义千问高速版' },
      { model_id: 'qwen-vl-max', name: 'Qwen VL Max', context_length: 32768, capability_tags: ['对话', '视觉'], description: '通义千问视觉理解模型' },
    ],
  },
  MiniMax: {
    name: 'MiniMax',
    provider_type: 'minimax',
    api_base_url: 'https://api.minimax.chat/v1',
    require_api_key: true,
    icon: 'minimax',
    models: [
      { model_id: 'MiniMax-Text-01', name: 'MiniMax-Text-01', context_length: 1048576, param_size: '456B', capability_tags: ['对话', 'Tools', 'MoE', 'Coder'], description: 'MiniMax 旗舰文本模型，1M 上下文' },
      { model_id: 'abab6.5s-chat', name: 'ABAB 6.5s', context_length: 245760, capability_tags: ['对话', 'Tools'], description: 'MiniMax 高速对话模型' },
    ],
  },
  OpenAI: {
    name: 'OpenAI',
    provider_type: 'openai',
    api_base_url: 'https://api.openai.com/v1',
    require_api_key: true,
    icon: 'openai',
    models: [
      { model_id: 'gpt-4o', name: 'GPT-4o', context_length: 131072, capability_tags: ['对话', 'Tools', '视觉', 'Coder', '推理'], description: 'OpenAI 旗舰多模态模型' },
      { model_id: 'gpt-4o-mini', name: 'GPT-4o Mini', context_length: 131072, capability_tags: ['对话', 'Tools', '视觉'], description: 'GPT-4o 轻量版' },
      { model_id: 'o1', name: 'o1', context_length: 200000, capability_tags: ['对话', '推理', 'Math', 'Coder'], description: 'OpenAI 推理模型' },
      { model_id: 'o1-mini', name: 'o1 Mini', context_length: 131072, capability_tags: ['对话', '推理', 'Math', 'Coder'], description: 'o1 轻量推理模型' },
    ],
  },
  'Azure OpenAI': {
    name: 'Azure OpenAI',
    provider_type: 'azure',
    api_base_url: '',
    require_api_key: true,
    icon: 'azure',
    models: [
      { model_id: 'gpt-4o', name: 'GPT-4o', context_length: 131072, capability_tags: ['对话', 'Tools', '视觉', 'Coder'] },
      { model_id: 'gpt-4o-mini', name: 'GPT-4o Mini', context_length: 131072, capability_tags: ['对话', 'Tools', '视觉'] },
    ],
  },
  '硅基流动': {
    name: '硅基流动',
    provider_type: 'siliconflow',
    api_base_url: 'https://api.siliconflow.cn/v1',
    require_api_key: true,
    icon: 'siliconflow',
    models: [
      { model_id: 'deepseek-ai/DeepSeek-V3', name: 'DeepSeek-V3', context_length: 65536, capability_tags: ['对话', 'Tools', 'Coder'], description: 'DeepSeek-V3 on SiliconFlow' },
      { model_id: 'deepseek-ai/DeepSeek-R1', name: 'DeepSeek-R1', context_length: 65536, capability_tags: ['对话', '推理', 'Math', 'Coder'], description: 'DeepSeek-R1 推理模型' },
      { model_id: 'Qwen/Qwen2.5-72B-Instruct', name: 'Qwen2.5-72B', param_size: '72B', context_length: 131072, capability_tags: ['对话', 'Tools', 'Coder'], description: '通义千问 2.5 72B' },
      { model_id: 'Qwen/Qwen2.5-7B-Instruct', name: 'Qwen2.5-7B', param_size: '7B', context_length: 131072, capability_tags: ['对话', 'Tools'], description: '通义千问 2.5 7B' },
      { model_id: 'THUDM/glm-4-9b-chat', name: 'GLM-4-9B', param_size: '9B', context_length: 131072, capability_tags: ['对话', 'Tools'], description: 'GLM-4 开源版' },
      { model_id: 'meta-llama/Meta-Llama-3.1-8B-Instruct', name: 'Llama-3.1-8B', param_size: '8B', context_length: 131072, capability_tags: ['对话', 'Tools'], description: 'Meta Llama 3.1 8B' },
    ],
  },
  'OpenAI-API-compatible': {
    name: 'OpenAI API 兼容',
    provider_type: 'openai_compatible',
    api_base_url: '',
    require_api_key: true,
    icon: 'openai',
    models: [],
  },
};

// ========== AI 供应商类型 ==========

export interface AiProvider {
  id: number;
  created_at?: string;
  updated_at?: string;
  name: string;
  provider_type: string;
  api_base_url: string;
  api_key_masked?: string;
  icon?: string;
  description?: string;
  sort?: number;
  status: number;
  model_count?: number;
}

export interface CreateAiProviderParams {
  name: string;
  provider_type: string;
  api_base_url: string;
  api_key?: string;
  icon?: string;
  description?: string;
  sort?: number;
  status?: number;
}

export interface UpdateAiProviderParams {
  name?: string;
  provider_type?: string;
  api_base_url?: string;
  api_key?: string;
  icon?: string;
  description?: string;
  sort?: number;
  status?: number;
}

export interface AiProviderListParams {
  page?: number;
  pageSize?: number;
  name?: string;
  status?: number;
}

// ========== AI 模型类型 ==========

export interface AiModel {
  id: number;
  created_at?: string;
  updated_at?: string;
  created_by?: number;
  provider_id: number;
  name: string;
  provider: string;
  model_id: string;
  version?: string;
  description?: string;
  api_base_url?: string;
  api_key_masked?: string;
  context_length?: number;
  param_size?: string;
  capability_tags: string[];
  custom_tags: string[];
  sort?: number;
  status: number;
}

export interface CreateAiModelParams {
  provider_id?: number;
  name: string;
  provider?: string;
  model_id: string;
  version?: string;
  description?: string;
  api_base_url?: string;
  api_key?: string;
  context_length?: number;
  param_size?: string;
  capability_tags?: string[];
  custom_tags?: string[];
  sort?: number;
  status?: number;
}

export interface UpdateAiModelParams {
  provider_id?: number;
  name?: string;
  provider?: string;
  model_id?: string;
  version?: string;
  description?: string;
  api_base_url?: string;
  api_key?: string;
  context_length?: number;
  param_size?: string;
  capability_tags?: string[];
  custom_tags?: string[];
  sort?: number;
  status?: number;
}

export interface AiModelListParams {
  page?: number;
  pageSize?: number;
  name?: string;
  provider?: string | string[];
  provider_id?: number;
  status?: number;
}

// ========== 对话相关类型 ==========

export type ContentPart =
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string } };

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string | ContentPart[];
}

export interface ChatRequestParams {
  messages: ChatMessage[];
  temperature?: number;
  max_tokens?: number;
}

// ========== 供应商 API ==========

export async function createAiProviderApi(params: CreateAiProviderParams) {
  return requestClient.post<AiProvider>('/ai-providers', params);
}

export async function getAiProviderListApi(params?: AiProviderListParams) {
  return requestClient.get<PageResult<AiProvider>>('/ai-providers', { params });
}

export async function getAiProviderApi(id: number) {
  return requestClient.get<AiProvider>(`/ai-providers/${id}`);
}

export async function updateAiProviderApi(id: number, params: UpdateAiProviderParams) {
  return requestClient.put(`/ai-providers/${id}`, params);
}

export async function deleteAiProviderApi(id: number) {
  return requestClient.delete(`/ai-providers/${id}`);
}

export async function updateAiProviderStatusApi(id: number, status: number) {
  return requestClient.put(`/ai-providers/${id}/status`, { status });
}

// ========== 模型 API ==========

export async function createAiModelApi(params: CreateAiModelParams) {
  return requestClient.post<AiModel>('/ai-models', params);
}

export async function getAiModelListApi(params?: AiModelListParams) {
  const query = params ? { ...params } : {};
  if (Array.isArray((query as any).provider)) {
    (query as any).provider = (query as any).provider.length > 0 ? (query as any).provider.join(',') : undefined;
  }
  return requestClient.get<PageResult<AiModel>>('/ai-models', { params: query });
}

export async function getAiModelApi(id: number) {
  return requestClient.get<AiModel>(`/ai-models/${id}`);
}

export async function updateAiModelApi(id: number, params: UpdateAiModelParams) {
  return requestClient.put(`/ai-models/${id}`, params);
}

export async function deleteAiModelApi(id: number) {
  return requestClient.delete(`/ai-models/${id}`);
}

export async function updateAiModelStatusApi(id: number, status: number) {
  return requestClient.put(`/ai-models/${id}/status`, { status });
}

export async function getAiModelProvidersApi() {
  return requestClient.get<string[]>('/ai-models/providers');
}

// ========== 对话 API ==========

export async function chatStreamApi(
  modelId: number,
  params: ChatRequestParams,
  options: {
    baseURL?: string;
    token?: string;
  },
): Promise<ReadableStreamDefaultReader<Uint8Array> | null> {
  const baseURL = options.baseURL || '/api';
  const url = `${baseURL}/ai-models/${modelId}/chat`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Accept': 'text/event-stream',
      'Authorization': options.token ? `Bearer ${options.token}` : '',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`请求失败 (${response.status}): ${errorText}`);
  }

  return response.body?.getReader() ?? null;
}

export function parseSSEChunk(chunk: string): string {
  const lines = chunk.split('\n');
  let content = '';

  for (const line of lines) {
    if (!line.startsWith('data: ')) continue;
    const data = line.slice(6);
    if (data === '[DONE]') continue;

    try {
      const parsed = JSON.parse(data);
      const delta = parsed?.choices?.[0]?.delta?.content;
      if (delta) {
        content += delta;
      }
    } catch {
      // skip
    }
  }

  return content;
}
